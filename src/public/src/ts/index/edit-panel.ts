import { GridStack } from "gridstack"
import ColorPicker from "simple-color-picker"

import { Grid, hex, IconResponse, SerializedCellContent } from "@backend-types/types"
import { fillGridWithDummies, removeDummies, dummyClass, createWidgetFromSerializedCell, isDark } from "./grid-utils"

export const trashSelector = "#grid__menu__trash"

const defaultColor = "#3e3e3e"

export default (grid: GridStack) => {
    const trash = document.querySelector(trashSelector)

    grid.on("dragstart", () => trash?.classList.add("active"))
    grid.on("dragstop", () => trash?.classList.remove("active"))

    async function saveGrid() {
        const cells = grid.getGridItems()

        const newCells = []
        for (const cell of cells) {
            if (cell.classList.contains(dummyClass)) continue

            let content: SerializedCellContent | undefined
            // find element that contains serialized data of the cell
            const elementWithSerializedData = cell.querySelector("[data-serialized]")
            if (elementWithSerializedData instanceof HTMLElement && elementWithSerializedData.dataset.serialized)
                content = JSON.parse(elementWithSerializedData.dataset.serialized)

            newCells.push({
                w: parseInt(cell.getAttribute("gs-w") || "1"),
                h: parseInt(cell.getAttribute("gs-h") || "1"),
                x: parseInt(cell.getAttribute("gs-x") || "0"),
                y: parseInt(cell.getAttribute("gs-y") || "0"),
                content
            })
        }

        const newGrid: Grid = {
            col: grid.opts.column! as number,
            row: grid.opts.row!,
            cells: newCells
        }

        // TODO: onerror
        const res = await fetch("/grid/update", {
            method: "PUT",
            headers: {
                "Content-type": "application/json"
            },
            body: JSON.stringify(newGrid)
        }) // .then(r => r.json())
    }

    const editButton = document.getElementById("grid__menu__edit")
    const gridBorder = document.querySelector<HTMLElement>(".grid__border")

    /**
     * Toggling editing mode with editButton
     */
    let editing = false
    editButton?.addEventListener("click", async () => {
        editing = !editing
        editButton.parentElement?.classList.toggle("active", editing)
        grid.el.classList.toggle("editing", editing)

        if (editing) {
            grid.enable()
            removeDummies(grid)
            editButton.title = "Save Cells"
            gridBorder!.style.opacity = "1"
        } else {
            grid.disable()
            await saveGrid()
            fillGridWithDummies(grid)
            editButton.title = "Edit Cells"
            gridBorder!.style.opacity = "0"
        }
    })

    // Creating Cells
    const menuItems = Array.from(document.getElementsByClassName("add-modal__menu__item"))
    const addModalTabs = Array.from(document.getElementsByClassName("add-modal__tab"))

    /**
     * by clicking menuItem with id '[name]' a tab with id '[name]-tab' will show
     */
    for (const item of menuItems) {
        item.addEventListener("click", () => {
            menuItems.forEach(i => i.classList.remove("active"))
            item.classList.add("active")

            addModalTabs.forEach(i => i.classList.remove("active"))
            document.getElementById(item.id + "-tab")?.classList.add("active")
        })
    }

    const addModal = document.querySelector(".add-modal")
    const addButton = document.getElementById("grid__menu__add")

    // TODO: check if cell can fit
    addButton?.addEventListener("click", () => {
        addModal?.classList.add("active")
    })

    window.addEventListener("click", e => {
        if (e.target != addModal) return
        addModal?.classList.remove("active")
    })

    // Creating Link Cells
    const searchIconsInp = <HTMLInputElement>document.getElementById("add-modal__icon-inp")
    const iconSearchResultsSi = document.querySelector(".add-modal__brand-icons")
    const iconSearchResultsFa = document.querySelector(".add-modal__normal-icons")
    const suggestedColor = document.getElementById("add-modal__suggested-color")
    const linkInp = <HTMLInputElement>document.getElementById("add-modal__link-inp")
    const linkValidation = document.querySelector(".add-modal__link-validator")
    const linkIconPreview = document.querySelector<HTMLElement>("#add-modal__link-cell-tab .add-modal__preview")
    const linkIconPreviewImg = linkIconPreview?.querySelector<HTMLImageElement>("img")
    const linkCellFinishBtn = document.querySelector<HTMLElement>("#add-modal__link-cell-tab .add-modal__finish")

    const colorPicker = new ColorPicker({
        width: 200,
        el: "#add-modal__color-picker",
        color: defaultColor
    })

    interface FriendlyIcon {
        title: string,
        url: string,
        hex: hex
    }

    async function searchForIcon(q: string, l: number): Promise<IconResponse> {
        return await fetch(`/grid/search_icon?q=${q}&l=${l}`).then(r => r.json())
    }

    function changePreviewColor(color: hex) {
        linkIconPreview!.style.backgroundColor = color
        linkIconPreviewImg?.classList.toggle("white", isDark(color))
    }

    function onIconClick(e: Event, icon: FriendlyIcon) {
        suggestedColor!.style.backgroundColor = icon.hex
        suggestedColor!.dataset.hex = icon.hex
        colorPicker.setColor(icon.hex)
        linkIconPreviewImg!.src = icon.url
        changePreviewColor(icon.hex)
    }

    function createIconEl(icon: FriendlyIcon) {
        let iconEl = document.createElement("div")
        iconEl.classList.add("icon-wrapper")
        iconEl.style.backgroundColor = icon.hex

        let img = document.createElement("img")
        img.src = icon.url
        img.title = icon.title

        if (isDark(icon.hex))
            img.classList.add("white")

        iconEl.appendChild(img)
        iconEl.addEventListener("click", e => onIconClick(e, icon))

        return iconEl
    }

    let searchTimeout: any
    searchIconsInp?.addEventListener("input", () => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(async () => {
            const res = await searchForIcon(searchIconsInp.value, 15)
            iconSearchResultsSi!.innerHTML = ""
            iconSearchResultsFa!.innerHTML = ""

            for (const icon of res.si) {
                const iconEl = createIconEl({
                    title: icon.title,
                    url: `https://cdn.jsdelivr.net/npm/simple-icons@v7/icons/${icon.slug}.svg`,
                    hex: "#" + icon.hex
                })
                iconSearchResultsSi?.appendChild(iconEl)
            }

            for (const icon of res.fa) {
                const iconEl = createIconEl({
                    title: icon.name,
                    url: `https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome@6.1.1/svgs/solid/${icon.name}.svg`,
                    hex: defaultColor
                })
                iconSearchResultsFa?.appendChild(iconEl)
            }
        }, 500)
    })

    colorPicker.onChange((c: hex) => changePreviewColor(c))

    suggestedColor?.addEventListener("click", () => {
        const color = suggestedColor.dataset.hex
        if (color) {
            colorPicker.setColor(color)
            changePreviewColor(color)
        }
    })

    const validUrl = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
    linkInp.addEventListener("input", () => {
        const valid = linkInp.value == "" || validUrl.test(linkInp.value)
        linkValidation?.classList.toggle("active", !valid)
    })

    linkCellFinishBtn?.addEventListener("click", () => {
        createWidgetFromSerializedCell(grid, {
            content: {
                type: "l",
                iconUrl: linkIconPreviewImg!.src,
                link: linkInp.value,
                bgColor: colorPicker.getHexString()
            }
        })
        addModal?.classList.remove("active")
        resetModal()
    })

    // Creating Dynamic Cells
    const builtInCells = Array.from(document.querySelectorAll<HTMLElement>("#add-modal__dynamic-cell-tab .icon-wrapper"))
    const iframeSrcInp = <HTMLInputElement>document.getElementById("add-modal__iframe-src-inp")
    const dynamicCellPreview = document.querySelector<HTMLIFrameElement>("#add-modal__dynamic-cell-tab .add-modal__preview iframe")
    const dynamicCellFinishBtn = document.querySelector<HTMLElement>("#add-modal__dynamic-cell-tab .add-modal__finish")

    let lastClickedDynIconSrc: string

    function onDynamicIconClick(icon: HTMLElement) {
        iframeSrcInp.value = ""
        lastClickedDynIconSrc = icon.dataset.src!
        dynamicCellPreview!.src = icon.dataset.src!
    }

    for (const icon of builtInCells)
        icon.addEventListener("click", () => onDynamicIconClick(icon))

    iframeSrcInp.addEventListener("input", () => {
        dynamicCellPreview!.src = iframeSrcInp.value
    })

    dynamicCellFinishBtn?.addEventListener("click", () => {
        let src = iframeSrcInp.value
        if (src === "" && lastClickedDynIconSrc)
            src = lastClickedDynIconSrc

        createWidgetFromSerializedCell(grid, {
            w: 2,
            h: 2,
            content: {
                type: "d",
                src
            }
        })
        addModal?.classList.remove("active")
        resetModal()
    })

    function resetModal() {
        // reset inputs
        searchIconsInp.value = ""
        iconSearchResultsSi!.innerHTML = ""
        iconSearchResultsFa!.innerHTML = ""
        colorPicker.setColor(defaultColor)
        suggestedColor!.style.backgroundColor = defaultColor
        linkInp!.value = ""
        iframeSrcInp.value = ""

        // reset previews
        linkIconPreview!.style.backgroundColor = defaultColor
        linkIconPreviewImg!.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
        dynamicCellPreview!.src = ""
    }
}
