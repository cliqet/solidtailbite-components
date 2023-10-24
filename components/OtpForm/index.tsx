import {
  For,
  Show,
  createSignal,
  Component,
  ComponentProps,
  ParentComponent,
  JSXElement,
  onMount,
  onCleanup
} from "solid-js";
import styles from './otpForm.module.css';

interface OtpFormConfig extends ComponentProps<ParentComponent> {
  body: JSXElement | Component;                 // JSXElement body for the form
  showBodyWhen?: boolean;                       // condition when to show the body

  footer: JSXElement | Component;               // JSXElement footer for the form
  showFooterWhen?: boolean;                     // condition when to show the footer

  inputFields: number;                          // the number of OTP fields
  showInputFieldsWhen?: boolean;                // condition when to show the input fields
  
  numbersOnly: boolean;                         // whether OTP fields accepts numbers only
  
  // both should have values when used
  generateCodeFn?: () => any;                   // callback function to generate new code
  generateCodeTime?: number;                    // time in ms until code can be regenerated
                                                // use this if you want a time gap between code generation
  
  submitFn: (code: string) => any;              // callback function when submitting OTP
  errorMsgOnSubmit: string | null;              // error message to show on submit
  disableSubmitBtnWhen?: boolean;               // condition to disable submit OTP button
  showSubmitBtnWhen?: boolean;                  // condition to show submit OTP button
}


const getMinutes = (time: number) : number => {
  return Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
}

const getSeconds = (time: number) : number => {
  return Math.floor((time % (1000 * 60)) / 1000);
}

const OtpForm: Component<OtpFormConfig> = (props) => {
  const numberOfInputs = [...Array(props.inputFields).keys()].map(x => x);
  const otpGroupRefs = Array(props.inputFields).fill(undefined);
  const [remainingTime, setRemainingTime] = createSignal(props.generateCodeTime ?? 0);
  const [seconds, setSeconds] = createSignal(getSeconds(props.generateCodeTime ?? 0));
  const [minutes, setMinutes] = createSignal(getMinutes(props.generateCodeTime ?? 0));

  const resetTimer = (newTime: number | undefined) => {
    if (!newTime) {
      return;
    }
    let currentTime = newTime;
    let currentMinutes = getMinutes(currentTime);
    let currentSeconds = getSeconds(currentTime);
    setRemainingTime(currentTime);
    setMinutes(currentMinutes);
    setSeconds(currentSeconds);
  }

  let interval: NodeJS.Timer;
  const runTimer = () => {
    if (!props.generateCodeTime) {
      return;
    }
    if (remainingTime() > 0) {
      interval = setInterval(() => {
        let currentTime = remainingTime() - 1000;
        if (currentTime <= 0) {
          clearInterval(interval);
        }

        let currentMinutes = getMinutes(currentTime);
        let currentSeconds = getSeconds(currentTime);
        setRemainingTime(currentTime);
        setMinutes(currentMinutes);
        setSeconds(currentSeconds);
      }, 1000);
    }
  }

  const customRequiredFocus = () => {
    return function (e: Event) {
      e.preventDefault();
      for(let i = 0; i < otpGroupRefs.length; i++) {
        if (otpGroupRefs[i].value === "") {
          otpGroupRefs[i].focus();
          break;
        }
      }
    };
  }

  const pasteOtpCode = (e: ClipboardEvent) => {
    const inputElement: HTMLInputElement = e.target as HTMLInputElement;

    // if the target is a text input
    if (inputElement.type === "text") {
      const clipboardData = e.clipboardData || (window as any).clipboardData;
      const pastedText = clipboardData.getData('text');

      otpGroupRefs.forEach((inputEl, i) => {
        // handle code with gap when copying. e.g. 12 456
        if(pastedText[i] !== " " && props.numbersOnly && !isNaN(pastedText[i])) {
          inputEl.value = pastedText[i];
        }

        if(pastedText[i] !== " " && !props.numbersOnly) {
          inputEl.value = pastedText[i];
        }
      });
    }
  }

  onMount(() => {
    // prevent default popup of required field
    document.addEventListener('invalid', (customRequiredFocus)(), true);

    // add pasting of otp code
    document.addEventListener("paste", pasteOtpCode);

    runTimer();
  });

  onCleanup(() => {
    document.removeEventListener('invalid', customRequiredFocus);
    document.removeEventListener('paste', pasteOtpCode);
  });

  const focusNextInput = (index: number, elementValue: string) => {
    if (!elementValue) {
      return;
    }

    if (props.numbersOnly && isNaN(Number(elementValue))) {
      otpGroupRefs[index].value = '';
      return;
    }

    otpGroupRefs[index + 1]?.focus();
    otpGroupRefs[index + 1]?.select();
  }

  const deleteOTPCharacter = (index: number, key: string) => {
    if (key === 'ArrowRight') {
      otpGroupRefs[index + 1]?.focus();
      otpGroupRefs[index + 1]?.select();
      return;
    }
    if (key === 'ArrowLeft') {
      otpGroupRefs[(index || 1) - 1]?.focus();
      otpGroupRefs[(index || 1) - 1]?.select();
      return;
    }
    if (!['Backspace', 'Delete'].includes(key)) {
      return;
    }

    otpGroupRefs[index].value = '';
    otpGroupRefs[(index || 1) - 1]?.focus();
    otpGroupRefs[(index || 1) - 1]?.select();
  };

  const clearFields = () => {
    otpGroupRefs.map(o => o.value = '');
  }

  const submitOtp = (e: Event) => {
    e.preventDefault();
    props.submitFn(
      otpGroupRefs.map(o => o?.value ?? '').join('')
    );
    clearFields();
  }

  const generateCode = () => {
    if (!props.generateCodeFn) {
      return;
    }
    clearInterval(interval);
    resetTimer(props.generateCodeTime);
    props.generateCodeFn();
    runTimer();
  }

  const formatTimeNumber = (timeNumber: number) => {
    return timeNumber.toString().padStart(2, '0')
  }

  return (
    <>
      <div class={styles.otpBody}>
        <Show when={props.showBodyWhen ?? true}>
          {props.body}
        </Show>

      </div>

      <form onsubmit={submitOtp} class={styles.otpInputForm}>
        <Show when={props.showInputFieldsWhen ?? true}>
          <div class={styles.otpInputs}>
            <For each={numberOfInputs}>
              {(_, index) =>
                <input
                  class={styles.otpInputField}
                  type="text"
                  id={`${index()}`}
                  inputmode={props.numbersOnly ? "numeric" : "text" }
                  required
                  autofocus={!index()}
                  ref={otpGroupRefs[index()]}
                  maxlength="1"
                  onKeyUp={({ key }) => deleteOTPCharacter(index(), key)}
                  onInput={({ currentTarget }) => focusNextInput(index(), currentTarget.value)}
                />
              }
            </For>
          </div>
        </Show>

        <Show when={props.errorMsgOnSubmit}>
          <p class="text-sm text-red-600 py-1">{props.errorMsgOnSubmit}</p>
        </Show>

        <div class={styles.otpTimeText}>
          <Show when={remainingTime() > 0 && props.generateCodeTime}>
            <p class="text-sm">
              Please wait before generating a new code.
            </p>
            <p class="text-sm">
              Time remaining: {formatTimeNumber(minutes())} : {formatTimeNumber(seconds())}
            </p>
          </Show>
          
          <Show when={remainingTime() <= 0 && props.generateCodeTime}>
            <p class="text-sm">Get OTP code</p>
            <p class="text-sm">
              <button
                disabled={props.disableSubmitBtnWhen ?? false} 
                id="generate-code" 
                onClick={generateCode} 
                type="button"
                class={styles.otpTimeTextBtn}
              ><span class="underline text-aqw-text-link">Click here</span></button>
            </p>
          </Show>
        </div>

        <Show when={props.showSubmitBtnWhen ?? true}>
          <div class={styles.otpButtonDiv}>
            <button
              id="otp-submit-btn"
              class={styles.otpSubmitBtn}
              type="submit"
              disabled={props.disableSubmitBtnWhen ?? false}
            >Confirm OTP</button>
          </div>
        </Show>

        <Show when={props.footer}>
          {props.footer}
        </Show>
      </form>
    </>
  );
}

export default OtpForm;