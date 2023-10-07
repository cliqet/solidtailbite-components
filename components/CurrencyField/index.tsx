import { Component, JSX, Show, createSignal } from "solid-js";
import styles from "./currencyfield.module.css"

export type LocaleType = 
"pl-PL" |      // 1 205,34 zł
"en-US" |      // $1,205.34
"en-GB" |      // £1,205.34
"en-IE" |      // €1,205.34
"de-DE" |      // 1.205,34 €
"fr-FR" |      // 1 205,34 €
"br-FR" |      // € 1 205,34
"ja-JP" |      // ￥1,205
"pt-TL" |      // 1 205,34 US$
"fr-CA" |      // 1 205,34 $
"en-CA";       // $1,205.34

const CurrencyField: Component<{
  id: string;
  placeholder: string;
  symbolComponent?: JSX.Element | Component;
  locale?: LocaleType;
  onInputFn: (value: string) => any;
}> = (props) => {
  let inputRef: HTMLInputElement;
  const [rawValue, setRawValue] = createSignal("");
  const [textValue, setTextValue] = createSignal("");
  const allowedChars = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "."];

  const handleKeyUp = (e: KeyboardEvent) => {
    let formattedValue;
    let valueAsNum;
    if (allowedChars.includes(e.key)) {
        setRawValue((prev) => prev + e.key);
        valueAsNum = Number(rawValue());
        formattedValue = new Intl.NumberFormat(
            `${props.locale ?? "en-US"}`
        ).format(valueAsNum);
    } else {
        valueAsNum = Number(rawValue());
        formattedValue = new Intl.NumberFormat(
            `${props.locale ?? "en-US"}`
        ).format(valueAsNum);
    }
    setTextValue(formattedValue as string);

    // reset if format becomes invalid
    if (textValue() === "NaN") {
        setRawValue("");
        setTextValue("");
    }

    // if last typed character is "." , display it in text field as either "." or "," 
    // depending on the locale
    if (rawValue().at(-1) === ".") {
        let tempForCents = rawValue() + "1";
        valueAsNum = Number(tempForCents);
        formattedValue = new Intl.NumberFormat(
            `${props.locale ?? "en-US"}`
        ).format(valueAsNum);
        setTextValue(`${formattedValue.slice(0, -1)}`);
    }
    inputRef.value = textValue();
    
    props.onInputFn(rawValue());
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Backspace") {
        let rawValueAsText = `${rawValue()}`;
        rawValueAsText = rawValueAsText.slice(0, -1);
        setRawValue(rawValueAsText);
        let valueAsNum = Number(rawValue());
        let formattedValue = new Intl.NumberFormat('en-US').format(valueAsNum);
        setTextValue(formattedValue as string);
        inputRef.value = textValue();

        props.onInputFn(rawValue());
    }
  }

  return (
    <div class="flex">
      <Show when={props.symbolComponent}>
        <span class={styles.symbolComponent}>
          {props.symbolComponent as JSX.Element}
        </span>
      </Show>

      <input
        ref={inputRef!}
        type="text"
        id={props.id}
        class={styles.currencyInput}
        classList={{
          "rounded-l-lg": Boolean(!props.symbolComponent),
        }}
        placeholder={props.placeholder}
        onKeyUp={(e) => handleKeyUp(e)}
        onKeyDown={(e) => handleKeyDown(e)}
      />
    </div>
  );
};

export default CurrencyField;
