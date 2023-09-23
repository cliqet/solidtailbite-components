import { Show, For, Component, createEffect, createMemo, JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { A } from "@solidjs/router";
import "flowbite";
import SortIcon from "./icons/sort-icon";
import styles from "./table.module.css";
import SearchIcon from "./icons/search-icon";
import RowActionArrowIcon from "./icons/row-action-arrow-icon";
import DownloadIcon from "./icons/download-icon";
import PrintIcon from "./icons/print-icon";

export type TableEventType =
  | "navigateFirst"
  | "navigatePrev"
  | "navigateNext"
  | "navigateLast"
  | "rowSelect"
  | "searchInput"
  | "searchClick"
  | "rowActionSubmit"
  | "filterBy"
  | "rowSelectAll";


export interface FilterOptions {
  name: string;
  value: string;
  display: string;
}

export interface FilterOptionsGroup {
  group: FilterOptions[];
  groupDisplay: string;
  onlyOne?: boolean;
}

export interface TableMetatdataType {
  currentPage?: number;
  pageLimit?: number;
  pageOffset?: number;
  rowSelected?: {
    value: any;
    checked: boolean;
  };
  rowSelectedAll?: {
    checked: boolean;
    rows: any[];
  };
  searchInputValue?: string;
  isClickedSearch?: boolean;
  rowActionSubmitted?: {
    rowAction: string;
    rows: any[];
  }
  filterOptions?: FilterOptions[];
}

interface TableRowComponentProps {
  row: any;
}

// requires a component to have at least the props row
export type TableRowComponent<T extends TableRowComponentProps> = (props: T) => JSX.Element;

export interface TableDataRequired {
  results: any[];
  count: number;
}

export type TableData<T extends TableDataRequired> = T & { [key: string]: any };

export interface ColDataType {
  type: "data";
  colName: string;
  property: string;
  sortable: boolean;
}

export interface ColLinkType {
  type: "link";
  colName: string;
  property: string;
  sortable: boolean;
  baseUrl: string;
  segmentUrl: string;
}

export interface ColComponentType {
  type: "component";
  colName: string;
  property?: string;
  renderComponent: (row: any) => JSX.Element;
}

export interface ExportActionType {
  csv: boolean;
  pdf: boolean;
  json: boolean;
}

export type ColPropsType = ColDataType | ColLinkType | ColComponentType;

export interface TableConfig {
  header?: JSX.Element | Component;
  data: TableData<{results: any[], count: number}>;
  colDataProperties: ColPropsType[];
  hasPagination?: boolean;
  searchPlaceholder?: string;
  rowActions?: string[];
  filterOptions?: FilterOptionsGroup[];
  pageLimit: number;
  pageOffset: number;
  tableEvent: (tableEvent: TableEventType, metadata: TableMetatdataType) => any;
  hasRowCheckBox?: boolean;
  id?: string;
  emptyDisplay: () => JSX.Element | Component;
  exportAction?: ExportActionType;
}

const Table: Component<TableConfig> = (props) => {
  // assign refs for each filter button
  let filterBtnOptionRefs: any[][] = [];
  let filterBtnStatus: {active: boolean, value: string | null}[][] = [];
  if (props.filterOptions) {
    for(let i=0; i<props.filterOptions.length; i++) {
      let subArr = [];
      let statusSubArr = [];
      for(let j=0; j<props.filterOptions[i].group.length; j++) {
        subArr.push(undefined);
        statusSubArr.push({ active: false, value: null});
      }
      filterBtnOptionRefs.push(subArr);
      filterBtnStatus.push(statusSubArr);
    }
  }

  const [tableState, setTableState] = createStore({
    currentPage: 1,
    pageOffset: 0,
    pageLimit: 10,
    data: props.data,
    sortColumn: { column: "", sortType: "" },
    searchKeyword: "",
    filterOpen: false,
    rowActionOpen: false,
    currentRowAction: "-- Select --",
    currentFilterBtnsStatus: filterBtnStatus
  });

  let chkBoxGroupRefs: HTMLInputElement[] = Array.from({ length: tableState.data.results.length });
  let chkBoxForAllRef: HTMLInputElement;

  createEffect(
    createMemo(
      () => tableState.data,
      () => {
        setTableState("sortColumn", { column: "", sortType: "" });
      }
    )
  );

  createEffect(() => setTableState("data", props.data));

  const onClickPrevious = async () => {
    setTableState((state) => ({
      currentPage: state.currentPage - 1,
      pageOffset: (state.currentPage - 1 - 1) * props.pageLimit,
    }));

    props.tableEvent("navigatePrev", {
      currentPage: tableState.currentPage,
      pageOffset: tableState.pageOffset,
    });
  };

  const onClickNext = async () => {
    setTableState((state) => ({
      currentPage: state.currentPage + 1,
      pageOffset: (state.currentPage + 1 - 1) * props.pageLimit,
    }));

    props.tableEvent("navigateNext", {
      currentPage: tableState.currentPage,
      pageOffset: tableState.pageOffset,
    });
  };

  const onClickFirst = async () => {
    setTableState({
      currentPage: 1,
      pageOffset: 0,
    });

    props.tableEvent("navigateFirst", {
      currentPage: tableState.currentPage,
      pageOffset: tableState.pageOffset,
    });
  };

  const onClickLast = async () => {
    const numOfPages = Math.floor(tableState.data.count / props.pageLimit);
    const remainingPages = Math.floor(tableState.data.count % props.pageLimit);
    const offset = numOfPages * props.pageLimit;
    setTableState((state) => ({
      currentPage: remainingPages === 0 ? numOfPages : numOfPages + 1,
      pageOffset: remainingPages === 0 ? offset - props.pageLimit : offset,
    }));

    props.tableEvent("navigateLast", {
      currentPage: tableState.currentPage,
      pageOffset: tableState.pageOffset,
    });
  };

  const toggleSort = (currentSortType: string): string => {
    if (currentSortType === "asc") {
      return "desc";
    } else {
      return "asc";
    }
  };

  const sortCurrentData = (column: string, sortType: string) => {
    let currentData = [...tableState.data.results];

    if (sortType === "asc") {
      currentData.sort((a, b) => {
        if (a[column] > b[column]) {
          return 1;
        } else if (b[column] > a[column]) {
          return -1;
        } else {
          return 0;
        }
      });
    } else {
      currentData.sort((a, b) => {
        if (b[column] > a[column]) {
          return 1;
        } else if (a[column] > b[column]) {
          return -1;
        } else {
          return 0;
        }
      });
    }

    setTableState((state) => ({
      data: { ...state.data, results: currentData },
    }));
  };

  const sortByColumn = (column: string): any => {
    if (tableState.sortColumn.column === column) {
      let currentSortType = tableState.sortColumn.sortType;
      sortCurrentData(column, toggleSort(currentSortType));
      setTableState("sortColumn", {
        column,
        sortType: toggleSort(currentSortType),
      });
    } else {
      sortCurrentData(column, "asc");
      setTableState("sortColumn", {
        column,
        sortType: "asc",
      });
    }
  };

  const onSearch = (keyword: string, e: Event) => {
    e.preventDefault();
    props.tableEvent("searchClick", {
      searchInputValue: keyword,
    });
  };

  // helper function for exporting csv
  const _safeData = (td: Element) => {
    let data = td.textContent;
    //Replace all double quote to two double quotes
    data = data!.replace(/"/g, `""`);
    //Replace , and \n to double quotes
    data = /[",\n"]/.test(data) ? `"${data}"` : data;
    return data;
  }

  const exportCsv = () => {
    let tableId = props.id ?? "table";
    let tableEl = document.getElementById(tableId);
    let rows = Array.from(tableEl!.querySelectorAll("tr"));

    let longestRow = rows.reduce((length, row) => (row.childElementCount > length ? row.childElementCount : length), 0);

    const lines = [];
    const ncols = longestRow;
    for (const row of rows) {
      let line = "";
      for (let i = 0; i < ncols; i++) {
        if (row.children[i] !== undefined) {
          const safeData = _safeData(row.children[i]);
          if(safeData !== "checkbox"){
            line += _safeData(row.children[i]);
          }
        }
        line += i !== ncols - 1 ? "," : "";
      }
      lines.push(line);
    }

    const csvData = lines.join("\n");
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "table.csv";
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 500);
  }
  
  const printPdf = () => {
    const tableHeader = document.getElementById("table-header")!.innerHTML;
    // create a copy of the element
    const table = document.getElementById('table-content')?.cloneNode(true) as Element;

    // remove checkboxes
    let headers = Array.from(table!.querySelectorAll("th"));
    if(props.hasRowCheckBox) {
      headers[0].remove();
    }
   
    let tbody = table.getElementsByTagName("tbody");
    let rows = Array.from(tbody[0].querySelectorAll("tr"));
    for(let i = 0; i < rows.length; i++) {
      let tdata = Array.from(rows[i].querySelectorAll("td"));
      for(let j = 0; j < tdata.length; j++) {
        if(j === 0 && props.hasRowCheckBox) {
          tdata[j].remove();
        }
        tdata[j].style.border = "1px solid black";
        tdata[j].style.padding = "2px";
        tdata[j].style.textAlign = "center";
      }
    }

    // remove any buttons
    let buttons = Array.from(table.querySelectorAll("button"));;
    buttons.forEach(btn => {
      btn.remove();
    });

    const tableContent = table?.innerHTML;    

    // CREATE A WINDOW OBJECT.
    let win = window.open('', '', 'height=700,width=700');

    win!.document.write('<html><head>');
    win!.document.write('<title>Table</title>');   // <title> FOR PDF HEADER.
    win!.document.write('<body>');
    win!.document.write(tableHeader);
    win!.document.write(tableContent);        
    win!.document.write('</body></html>');

    win!.document.close(); 	// CLOSE THE CURRENT WINDOW.

    win!.print();    // PRINT THE CONTENTS.
  }

  // helper function for export as json
  const toArrayOfObjects = (table: Element) => {
    const columns = Array.from(table.querySelectorAll('th')).map(
      heading => heading.textContent,
    ) as string[];
  
    const rows = table.querySelectorAll('tbody > tr');
  
    return Array.from(rows).map(row => {
      const dataCells = Array.from(row.querySelectorAll('td'));
  
      return columns.reduce((obj: any, column: string, index: number) => {
        obj[column] = dataCells[index].textContent;
        return obj;
      }, {});
    });
  }

  const exportJson = () => {
    let tableId = props.id ?? "table";
    let tableEl = document.getElementById(tableId);

    const jsonStr = JSON.stringify(toArrayOfObjects(tableEl as Element));
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      jsonStr,
    )}`;
  
    const anchorElement = document.createElement('a');
  
    anchorElement.href = dataStr;
    anchorElement.download = "table.json";
  
    document.body.appendChild(anchorElement);
    anchorElement.click();
  
    document.body.removeChild(anchorElement);
  }

  return (
    <Show when={props.data}>
      <section class={`${styles.tableComponent}`}>
        {/* container for actions and search */}
        <Show when={props.searchPlaceholder || props.rowActions}>
          <div
            class={`${styles.tableAction}`}
            classList={{
              "flex flex-col lg:flex-row justify-between p-2": Boolean(props.rowActions),
              "flex justify-end m-4": !props.rowActions,
            }}
          >
            <Show when={props.rowActions}>
              <div>
                <button
                  id="dropdownRadioButton"
                  class={`${styles.tableActionRowActionDropdown}`}
                  onClick={() => {
                    setTableState("rowActionOpen", !tableState.rowActionOpen);
                    setTableState("currentRowAction", "-- Select -- ");
                  }}
                  type="button"
                >
                  {tableState.currentRowAction}
                  <RowActionArrowIcon class={`${styles.tableActionRowActionDropdownArrowSvg}`} />
                </button>

                {/* Dropdown menu */}
                <div
                  id="dropdownRadio"
                  class={`${styles.tableActionRowActionPanel}`}
                  classList={{
                    hidden: !tableState.rowActionOpen,
                  }}
                >
                  <For each={props.rowActions}>
                    {(action, i) => {
                      return (
                        <ul
                          aria-labelledby="dropdownRadioButton"
                          class={`${styles.tableActionRowActionPanelUl}`}
                        >
                          <li>
                            <div class={`${styles.tableActionRowActionPanelLiDiv}`}>
                              <input
                                id={`filter-${i()}`}
                                type="radio"
                                class={`${styles.tableActionRowActionPanelInput}`}
                                value={action}
                                name="filter-radio"
                                onChange={() => {
                                  setTableState("currentRowAction", action);
                                  setTableState("rowActionOpen", false);
                                }}
                              />
                              <label
                                for={`filter-${i()}`}
                                class={`${styles.tableActionRowActionPanelLabel}`}
                              >
                                {action}
                              </label>
                            </div>
                          </li>
                        </ul>
                      );
                    }}
                  </For>
                </div>

                <button 
                  class={`${styles.tableActionRowActionBtn}`}
                  onClick={() => {
                    let selectedRows: any[] = [];
                    chkBoxGroupRefs.forEach(checkbox => {
                      if (checkbox.checked) {
                        selectedRows.push(JSON.parse(checkbox.value));
                      }
                    });
                    props.tableEvent("rowActionSubmit", {
                      rowActionSubmitted: {
                        rowAction: tableState.currentRowAction,
                        rows: selectedRows
                      }
                    });
                    setTableState("currentRowAction", "-- Select --");
                    chkBoxGroupRefs.map(checkbox => {
                      checkbox.checked = false;
                    });
                    chkBoxForAllRef.checked = false;
                  }}
                >Go</button>
              </div>
            </Show>

            <Show when={props.searchPlaceholder}>
              <div class="my-3 w-full lg:w-6/12">
                <div class="relative">
                  <form onSubmit={(e) => onSearch(tableState.searchKeyword, e)}>
                    <button 
                      class={`${styles.tableActionSearchBtn}`}
                      onClick={(e) => onSearch(tableState.searchKeyword, e)}
                    >
                      <SearchIcon class={`${styles.tableActionSearchIconSvg}`} />
                    </button>
                    <input
                      type="text"
                      id="table-search"
                      value={tableState.searchKeyword}
                      class={`input ${styles.tableActionSearchInput}`}
                      placeholder={`${props.searchPlaceholder}`}
                      onInput={({ currentTarget }) => {
                        setTableState("searchKeyword", currentTarget.value);
                        props.tableEvent("searchInput", {
                          searchInputValue: tableState.searchKeyword,
                        });
                      }}
                    />
                  </form>
                </div>
              </div>
            </Show>
          </div>
        </Show>
        
        {/* filter container */}
        <Show when={props.filterOptions}>
        <div class="flex-col border-2 rounded m-2 p-2">
          <div>
            <button 
              class={`${styles.tableFilterBtn}`}
              onClick={() => setTableState("filterOpen", !tableState.filterOpen)}
              >
                <Show when={!tableState.filterOpen}>
                  <h1>Filter</h1>
                  <RowActionArrowIcon class="w-3 h-6 ml-2" />
                </Show>
                <Show when={tableState.filterOpen}>
                  <h1>Hide</h1>
                  <RowActionArrowIcon class="w-3 h-6 ml-2 rotate-180" />
                </Show>
            </button>

            <Show when={tableState.filterOpen}>
              <div class="my-3">
                <For each={props.filterOptions}>
                    {(filterGroup, i) => (
                      <fieldset class="border-2 flex-col p-2">
                        <legend class="ml-5">{filterGroup.groupDisplay}</legend>
                        <For each={filterGroup.group}>
                          {(option, j) => (
                            <button
                              ref={filterBtnOptionRefs[i()][j()]}
                              value={JSON.stringify(option)}
                              class={`${styles.tableFilterOptionBtn}`}
                              classList={{
                                [`${styles.tableFilterOptionBtnActive}`] : tableState.currentFilterBtnsStatus[i()][j()].active
                              }}
                              onClick={() => {
                                // make everything in this group inactive first except the one being clicked
                                if (filterGroup.onlyOne) {
                                  for(let m = 0; m < tableState.currentFilterBtnsStatus[i()].length; m++) {
                                    if (j() !== m) {
                                      setTableState(
                                        "currentFilterBtnsStatus",
                                        [i()],
                                        [m],
                                        {
                                          active: false,
                                          value: null
                                        }
                                      );
                                    }
                                  }
                                }

                                // set currently clicked filter
                                setTableState(
                                  "currentFilterBtnsStatus", 
                                  [i()], 
                                  [j()], 
                                  {
                                    active: !tableState.currentFilterBtnsStatus[i()][j()].active,
                                    value: filterBtnOptionRefs[i()][j()].value
                                  }
                                );

                                // create an array of active filter options
                                let filterOptions: FilterOptions[] = [];
                                for(let k = 0; k < tableState.currentFilterBtnsStatus.length; k++) {
                                  for(let l = 0; l < tableState.currentFilterBtnsStatus[k].length; l++) {
                                    if (tableState.currentFilterBtnsStatus[k][l].active) {
                                      filterOptions.push(JSON.parse(filterBtnOptionRefs[k][l].value));
                                    }
                                  }
                                }  
                                props.tableEvent("filterBy", { filterOptions });
                              }}
                            >
                              <span class="underline mx-2">{option.display}</span>
                            </button>
                          )}
                        </For>
                      </fieldset>
                    )}
                </For>
              </div>
            </Show>
          </div>
        </div>
        </Show>

        {/* export section */}
        <Show when={props.exportAction}>
          <div class="flex border-2 rounded m-2 p-2">
            <Show when={props.exportAction?.csv}>
              <button 
                type="button" 
                class={`group ${styles.exportBtn}`}
                onClick={exportCsv}
              >
                <DownloadIcon />
                <span class={`${styles.exportBtnTooltip} group-hover:block`}>Download CSV</span>
              </button>
            </Show>

            <Show when={props.exportAction?.pdf}>
              <button 
                type="button" 
                class={`group ${styles.exportBtn}`}
                onClick={printPdf}
              >
                <PrintIcon />
                <span class={`${styles.exportBtnTooltip} group-hover:block`}>Print PDF</span>
              </button>
            </Show>

            <Show when={props.exportAction?.json}>
              <button 
                type="button" 
                class={`group ${styles.exportBtn}`}
                onClick={exportJson}
              >
                <span class="text-lg font-bold">{"{ }"}</span>
                <span class={`${styles.exportBtnTooltip} group-hover:block`}>Download JSON</span>
              </button>
            </Show>
          </div>
        </Show>

        <header id="table-header" class={`${styles.tableComponentHeader}`}>
          <Show when={props.header}>
            {props.header}
          </Show>
          <Show when={!props.header}>
            <h1 class={`${styles.tableComponentHeaderH1}`}>Table</h1>
          </Show>
        </header>

        {/* actual table */}
        <div id="table-content" class="overflow-scroll">
          <table
            id={`${props.id ?? "table"}`} 
            class={`${styles.table}`}
          >
            <thead class={`${styles.tableThead}`}>
              <tr>
                <Show when={props.hasRowCheckBox}>
                  <th scope="col" class="p-4">
                    <div class="flex items-center">
                      <input
                        ref={chkBoxForAllRef!}
                        id="checkbox-all"
                        type="checkbox"
                        class={`${styles.tableTheadThCheckbox}`}
                        onClick={(e) => {
                          if (e.currentTarget.checked) {
                            let rowsValue = chkBoxGroupRefs.map(checkbox => {
                              checkbox.checked = true;
                              return JSON.parse(checkbox.value);
                            });
                            props.tableEvent("rowSelectAll", {
                              rowSelectedAll: {
                                checked: true,
                                rows: rowsValue
                              }
                            });
                          } else {
                            chkBoxGroupRefs.forEach(checkbox => {
                              checkbox.checked = false;
                            });
                            props.tableEvent("rowSelectAll", {
                              rowSelectedAll: {
                                checked: false,
                                rows: []
                              }
                            });
                          }
                        }}
                      />
                      <label for="checkbox-all" class="sr-only">
                        checkbox
                      </label>
                    </div>
                  </th>
                </Show>
                <For each={props.colDataProperties}>
                  {(colData, i) => {
                    return (
                      <th scope="col" class={`${styles.tableTheadTh}`}>
                        <div class={`${styles.tableTheadDiv}`}>
                          {colData.colName}
                          <Show
                            when={
                              (colData.type === "data" ||
                                colData.type === "link") &&
                              colData.sortable &&
                              tableState.data.results.length > 0
                            }
                          >
                            <button
                              id={colData.property}
                              type="button"
                              onclick={() =>
                                sortByColumn((colData as ColDataType).property)
                              }
                            >
                              <SortIcon class={`${styles.tableTheadThSortSvg}`} />
                            </button>
                          </Show>
                        </div>
                      </th>
                    );
                  }}
                </For>
              </tr>
            </thead>

            <Show when={tableState.data.results.length > 0}>
              <tbody id="table-body">
                <For each={tableState.data.results}>
                  {(rowData, i) => (
                    <tr class={`${styles.tableTbodyTr}`}>
                      <Show when={props.hasRowCheckBox}>
                        <td class="w-4 p-4">
                          <div class="flex items-center">
                            <input
                              id={`checkbox-table-${i()}`}
                              type="checkbox"
                              ref={chkBoxGroupRefs[i()]}
                              class={`${styles.tableTbodyTdCheckbox}`}
                              value={JSON.stringify(rowData)}
                              onClick={(e) => {
                                props.tableEvent('rowSelect', {
                                  rowSelected: {
                                    value: JSON.parse(e.currentTarget.value),
                                    checked: e.currentTarget.checked
                                  }
                                });
                              }}
                            />
                            <label for="checkbox-table-1" class="sr-only">
                              checkbox
                            </label>
                          </div>
                        </td>
                      </Show>
                      <For each={props.colDataProperties}>
                        {(col, i) => (
                          <td class={`${styles.tableTbodyTd}`}>
                            <Show when={col.type === "data"}>
                              {rowData[(col as ColDataType).property]}
                            </Show>
                            <Show when={col.type === "link"}>
                              <A
                                class="underline"
                                href={`${(col as ColLinkType).baseUrl}/${
                                  rowData[(col as ColLinkType).segmentUrl]
                                }`}
                              >
                                {rowData[(col as ColDataType).property]}
                              </A>
                            </Show>
                            <Show when={col.type === "component"}>
                              {(col as ColComponentType).renderComponent(rowData)}
                            </Show>
                          </td>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </Show>
          </table>
        </div>

        {/* pagination section */}
        <Show when={props.hasPagination && tableState.data.results.length > 0}>
          <nav class={`${styles.tableNav}`} aria-label="Table navigation">
            <span class={`${styles.navText}`}>
              Showing
              <span class={`${styles.navTextSpan}`}>
                {` ${props.pageLimit * (tableState.currentPage - 1) + 1} -
                    ${
                      props.pageLimit * tableState.currentPage <
                      tableState.data.count
                        ? props.pageLimit * tableState.currentPage
                        : tableState.data.count
                    } `}
              </span>{" "}
              of
              <span>{` ${tableState.data.count}`}</span>
            </span>

            <ul class={`${styles.tableUl}`}>
              <Show when={tableState.currentPage > 1}>
                <li>
                  <button
                    type="button"
                    class={`btn ${styles.navBtn}`}
                    onClick={onClickFirst}
                  >
                    First
                  </button>
                </li>
              </Show>
              <li>
                <button
                  type="button"
                  class={`btn ${styles.navBtn}`}
                  disabled={tableState.currentPage === 1}
                  onClick={onClickPrevious}
                >
                  Previous
                </button>
              </li>
              <li>
                <button
                  type="button"
                  class={`btn ${styles.navBtn}`}
                  disabled={
                    tableState.currentPage * props.pageLimit >
                    tableState.data.count
                  }
                  onClick={onClickNext}
                >
                  Next
                </button>
              </li>
              <Show
                when={
                  tableState.currentPage * props.pageLimit <
                  tableState.data.count
                }
              >
                <li>
                  <button
                    type="button"
                    class={`btn ${styles.navBtn}`}
                    onClick={onClickLast}
                  >
                    Last
                  </button>
                </li>
              </Show>
            </ul>
          </nav>
        </Show>

        {/* empty data section */}
        <Show when={tableState.data.results.length < 1}>
          <div class={`${styles.emptyDataDiv}`}>
            {(props.emptyDisplay() as JSX.Element)}
          </div>
        </Show>
      </section>
    </Show>
  );
};

export default Table;
