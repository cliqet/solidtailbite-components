import { Component, For, createSignal, Show, onMount, onCleanup } from "solid-js";
import styles from "./lookupfield.module.css";

const LookupField: Component<{
  onSelect: (itemSelected: any) => any; 
  data: {[key: string]: any}[]; 
  placeholder: string; 
  inputId: string; 
  optionTextKey: string; 
  required?: boolean; 
  disabled?: boolean; 
}> = (props) => {
  const [selectList, setSelectList] = createSignal<any[]>([]);
  const [groupIndexes, setGroupIndexes] = createSignal<number[]>([]);
  const [currentKeyFocus, setCurrentKeyFocus] = createSignal<number>(0);
  const [inputText, setInputText] = createSignal("");
  const [hasSelected, setHasSelected] = createSignal(false);

  let divRef: HTMLDivElement | null = null;
  let selectDivRef: HTMLDivElement | null = null;
  let selectGroupRefs: HTMLDivElement[] = [];
  let inputEl!: HTMLInputElement;

  const selectActions = (index: number) => {
    setHasSelected(true);
    props.onSelect(selectList()[index]);
    setInputText(selectList()[index][props.optionTextKey]);
    setSelectList([]);
    setGroupIndexes([]);
    setCurrentKeyFocus(0);
  }

  const onPointerSelect = (index: number) => {
    if (selectList().length > 0) {
      selectActions(index);
    }
  };

  const handleInputClick = (input: string) => {
    setInputText(input);
    if (input.length === 0) {
      setSelectList(props.data);
      setGroupIndexes([...Array(props.data.length).keys()]);
      setCurrentKeyFocus(0);
      selectGroupRefs[0].focus();
      return;
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    const container = divRef?.getBoundingClientRect();
    // if clicked outside of selectable elements   
    if (event.clientX < container!.left || event.clientX > container!.right
      || event.clientY < container!.top || event.clientY > container!.bottom) {
      if (selectList().length > 0) {
        setSelectList([]);
        setGroupIndexes([]);
        setCurrentKeyFocus(0);
      }
      // deletes text if not within choices
      if (!hasSelected()) {
        setInputText("");
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (document.activeElement === inputEl && selectList().length > 0) {
      
      if (event.key === "ArrowUp" && currentKeyFocus() > 0) {
        setCurrentKeyFocus((prev) => prev - 1);
        selectDivRef?.scrollBy({
          top: -selectGroupRefs[groupIndexes()[currentKeyFocus()]].clientHeight,
          behavior: 'auto'
        });
        return;
      }
  
      if (event.key === "ArrowDown" && currentKeyFocus() < selectList().length - 1) {
        setCurrentKeyFocus((prev) => prev + 1);
        selectDivRef?.scrollBy({
          top: selectGroupRefs[groupIndexes()[currentKeyFocus()]].clientHeight,
          behavior: 'auto'
        });
        return;
      }
  
      if (event.key === "Enter") {
        selectGroupRefs[groupIndexes()[currentKeyFocus()]].click();
        return;
      }
    }
  }

  onMount(() => {
    window.addEventListener("click", handleClickOutside);
    divRef!.addEventListener("keydown", handleKeyDown);
    inputEl = document.getElementById(props.inputId) as HTMLInputElement;
  });

  onCleanup(() => {
    window.removeEventListener("click", handleClickOutside);
    divRef!.removeEventListener("keydown", handleKeyDown);
  });

  const handleInputChange = (input: string) => {
    setHasSelected(false);
    setInputText(input);
    if (input.length === 0) {
      setSelectList(props.data);
      setGroupIndexes([...Array(props.data.length).keys()]);
      setCurrentKeyFocus(0);
      return;
    }
    let tempIndexes: number[] = [];
    const results = props.data.filter((item, i) => {
      
      if (item[props.optionTextKey].toLowerCase().startsWith(input.toLowerCase())) {
        tempIndexes.push(i);
        return item;
      }
    });
    setSelectList(results);
    setGroupIndexes(tempIndexes);
    setCurrentKeyFocus(0);
  };

  return (
    <>
      <div ref={divRef!} class={styles.lookupDiv}>
        <input
          class={styles.inputEl}
          type="search"
          placeholder={props.placeholder}
          value={inputText()}
          autocomplete="off"
          id={props.inputId}
          disabled={props.disabled ?? false}
          required={props.required ?? true}
          onInput={(e: Event) => {
            handleInputChange((e.currentTarget as HTMLInputElement).value);
          }}
          onClick={(e: Event) => {
            handleInputClick((e.currentTarget as HTMLInputElement).value);
          }}
        />

        <Show when={selectList().length > 0}>
          <div ref={selectDivRef!} class={styles.selectDiv}>
            <For each={selectList()}>
              {(item, i) => (
                <div
                  ref={selectGroupRefs![i()]}
                  class={styles.selectEl}
                  classList={
                    {
                      [styles.selectElActive] : currentKeyFocus() === i()
                    }
                  }
                  id={`${i()}`}
                  onClick={() => onPointerSelect(i())}
                >
                  {item[props.optionTextKey]}
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </>
  );
};

export default LookupField;
