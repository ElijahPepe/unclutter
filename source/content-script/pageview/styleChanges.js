import browser from "webextension-polyfill";
import { unPatchStylesheets } from "./patchStylesheets";

export const overrideClassname = "lindylearn-document-override";

export async function unPatchDocumentStyle() {
    // restore original styles first
    unPatchStylesheets();
    // wait for rerender
    await new Promise((resolve, _) => setTimeout(resolve, 0));

    // remove most modifications
    document
        .querySelectorAll(`.${overrideClassname}`)
        .forEach((e) => e.remove());
}

export function modifyBodyStyle() {
    // set start properties for animation immediately
    document.body.style.width = "100%";
    // document.body.style.margin = "0";
    // document.body.style.maxWidth = "none";

    // set animation style inline to have out transition
    // easeOutExpo from easings.net
    document.body.style.transition = `margin-top 0.15s cubic-bezier(0.16, 1, 0.3, 1),
	margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1),
	width 0.3s cubic-bezier(0.16, 1, 0.3, 1)`;

    const bodyStyle = window.getComputedStyle(document.body);

    // add miniscule top padding if not already present, to prevent top margin collapse
    // note that body margin is rewritten into padding in cssTweaks.ts
    if (["", "0px"].includes(bodyStyle.paddingTop)) {
        document.body.style.paddingTop = "0.05px";
    }
    // add some minimal padding if none present (0 padding looks quite ugly)
    if (["", "0px"].includes(bodyStyle.paddingLeft)) {
        document.body.style.paddingLeft = "20px";
        document.body.style.paddingRight = "20px";
    }
}

export function insertBackground() {
    // create element of full height of all children, in case body height != content height
    var background = document.createElement("div");
    background.id = "lindy-body-background";
    background.className = `${overrideClassname} lindy-body-background`;

    // get page background to use
    // const htmlBackground = window.getComputedStyle(
    //     document.documentElement
    // ).background;
    const bodyBackground = window.getComputedStyle(document.body).background;
    let backgroundColor;
    if (bodyBackground && !bodyBackground.includes("rgba(0, 0, 0, 0)")) {
        backgroundColor = bodyBackground;

        // else if (htmlBackground && !htmlBackground.includes("rgba(0, 0, 0, 0)")) {
        //     backgroundColor = htmlBackground;
        // }
    } else {
        backgroundColor = "white";
    }
    background.style.background = backgroundColor;

    // body '100%' may not refer to full height of children (e.g. https://torontolife.com/memoir/the-horrifying-truth-about-my-biological-father/)
    background.style.height = `${document.body.scrollHeight}px`;
    document.body.appendChild(background);

    // update height after style fixes are done
    // TODO use MutationObserver or setTimeout(, 0) after style changes inserted?
    setTimeout(updateBackgroundHeight, 5000);
}

function updateBackgroundHeight() {
    // get height of body children to exclude background element itself
    // TODO exclude absolute positioned elements?
    const childHeights = [...document.body.children]
        .filter((node) => node.id !== "lindy-body-background")
        .map((node) => node.scrollHeight);

    const bodyHeigth = childHeights.reduce((sum, height) => sum + height, 0);

    const background = document.getElementById("lindy-body-background");
    if (background) {
        background.style.height = `${bodyHeigth}px`;
    }
}

export function createStylesheetLink(url) {
    var link = document.createElement("link");
    link.classList.add(overrideClassname);
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
}

export function createStylesheetText(text, styleId) {
    var style = document.createElement("style");
    style.classList.add(overrideClassname);
    style.classList.add(styleId);
    style.type = "text/css";
    style.rel = "stylesheet";
    style.innerHTML = text;
    document.head.appendChild(style);
}

export function insertDomainToggle(domain) {
    var div = document.createElement("div");
    div.innerHTML = `Unclutter ${domain}`;
    div.className = `${overrideClassname} lindy-domain-toggle`;
    document.body.appendChild(div);

    // var img = document.createElement("img");
    // img.src = browser.runtime.getURL("assets/icons/share.svg");
    // a.appendChild(img);
}

// button to share the annotations of the active page
function insertShareButton() {
    var a = document.createElement("a");
    a.href = `https://annotations.lindylearn.io/page?url=${window.location.href}`;
    a.className = `${overrideClassname} share-icon`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);

    var img = document.createElement("img");
    img.src = browser.runtime.getURL("assets/icons/share.svg");
    a.appendChild(img);
}
