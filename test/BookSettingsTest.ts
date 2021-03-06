import { expect } from "chai";
import { stub } from "sinon";

import BookSettings from "../src/BookSettings";
import BookView from "../src/BookView";
import MemoryStore from "../src/MemoryStore";

describe("BookSettings", () => {
    let start: Sinon.SinonStub;
    let stop: Sinon.SinonStub;
    let getCurrentPosition: Sinon.SinonStub;
    let goToPosition: Sinon.SinonStub;

    class MockBookView implements BookView {
        public id: number;
        public name: string;
        public label: string;
        public bookElement: Element;
        public sideMargin: number;
        public height: number;
        public constructor(id: number, name: string, label: string) {
            this.id = id;
            this.name = name;
            this.label = label;
        }
        public start(position: number) {
            start(this.id, position);
        }
        public stop() {
            stop(this.id);
        }
        public getCurrentPosition() {
            return getCurrentPosition(this.id);
        }
        public goToPosition(position: number) {
            goToPosition(this.id, position);
        }
        public goToElement() {}
    }

    let view1: MockBookView;
    let view2: MockBookView;
    let store: MemoryStore;
    let settings: BookSettings;

    const click = (element: any) => {
        const event = document.createEvent("HTMLEvents");
        event.initEvent("click", false, true);
        element.dispatchEvent(event);
    };

    const pause = (ms = 0): Promise<void> => {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    };

    beforeEach(async () => {
        start = stub();
        stop = stub();
        getCurrentPosition = stub().returns(0);
        goToPosition = stub();

        view1 = new MockBookView(1, "view1", "View 1");
        view2 = new MockBookView(2, "view2", "View 2");

        store = new MemoryStore();
        settings = await BookSettings.create({
            store,
            bookViews: [view1, view2],
            fontSizesInPixels: [12, 14, 16]
        });
    });

    describe("#create", () => {
        it("obtains the selected view from the store", async () => {
            await store.set("settings-selected-view", view2.name);
            settings = await BookSettings.create({
                store,
                bookViews: [view1, view2],
                fontSizesInPixels: []
            });
            expect(settings.getSelectedView()).to.equal(view2);
        });

        it("sets the selected view to the first view if there's no selected view in the store", () => {
            expect(settings.getSelectedView()).to.equal(view1);
        });

        it("obtains the selected font size from the store", async () => {
            await store.set("settings-selected-font-size", "18px");
            settings = await BookSettings.create({
                store,
                bookViews: [view1, view2],
                fontSizesInPixels: [12, 14, 16, 18]
            });
            expect(settings.getSelectedFontSize()).to.equal("18px");
        });

        it("sets the selected font size to the default if the selected font size in the store isn't one of the options", async () => {
            await store.set("settings-selected-font-size", "12345px");
            settings = await BookSettings.create({
                store,
                bookViews: [view1, view2],
                fontSizesInPixels: [12, 14, 16, 18],
                defaultFontSizeInPixels: 18
            });
            expect(settings.getSelectedFontSize()).to.equal("18px");
        });

        it("sets the selected font size to the default if there's no selected font size in the store", async () => {
            settings = await BookSettings.create({
                store,
                bookViews: [view1, view2],
                fontSizesInPixels: [14, 16],
                defaultFontSizeInPixels: 14
            });
            expect(settings.getSelectedFontSize()).to.equal("14px");
        });

        it("sets the selected font size to the middle font size if the default isn't one of the options", async () => {
            settings = await BookSettings.create({
                store,
                bookViews: [view1, view2],
                fontSizesInPixels: [14, 16],
                defaultFontSizeInPixels: 12345
            });
            expect(settings.getSelectedFontSize()).to.equal("16px");
        });

        it("sets the selected font size to the middle font size (rounded up) if there's no default and no selected font size in the store", async () => {
            expect(settings.getSelectedFontSize()).to.equal("14px");

            settings = await BookSettings.create({
                store,
                bookViews: [view1, view2],
                fontSizesInPixels: [12, 14]
            });
            expect(settings.getSelectedFontSize()).to.equal("14px");

            settings = await BookSettings.create({
                store,
                bookViews: [view1, view2],
                fontSizesInPixels: [10, 12, 14, 16]
            });
            expect(settings.getSelectedFontSize()).to.equal("14px");
        });
    });

    describe("#renderControls", () => {
        it("renders a button for each view", async () => {
            const element = document.createElement("div");
            settings.renderControls(element);

            let view1Button = element.querySelector("button[class='view1 active']") as HTMLButtonElement;
            expect(view1Button.innerHTML).to.contain("View 1");
            expect(view1Button.getAttribute("aria-label")).to.equal("View 1 mode enabled");
            let view2Button = element.querySelector("button[class=view2]") as HTMLButtonElement;
            expect(view2Button.innerHTML).to.contain("View 2");
            expect(view2Button.getAttribute("aria-label")).to.equal("View 2 mode disabled");

            // If there's no views or only 1 view, views don't show up in the settings.

            settings = await BookSettings.create({
                store,
                bookViews: [view1],
                fontSizesInPixels: [12]
            });
            settings.renderControls(element);
            view1Button = element.querySelector("button[class='view1 active']") as HTMLButtonElement;
            expect(view1Button).to.be.null;
            view2Button = element.querySelector("button[class=view2]") as HTMLButtonElement;
            expect(view2Button).to.be.null;

            settings = await BookSettings.create({
                store,
                bookViews: [],
                fontSizesInPixels: [12]
            });
            settings.renderControls(element);
            view1Button = element.querySelector("button[class='view1 active']") as HTMLButtonElement;
            expect(view1Button).to.be.null;
        });

        it("changes view when a view button is clicked", async () => {
            const element = document.createElement("div");
            settings.renderControls(element);

            const view1Button = element.querySelector("button[class='view1 active']") as HTMLButtonElement;
            const view2Button = element.querySelector("button[class=view2]") as HTMLButtonElement;

            click(view2Button);
            await pause();

            expect(getCurrentPosition.callCount).to.equal(1);
            expect(getCurrentPosition.args[0][0]).to.equal(1);

            expect(stop.callCount).to.equal(1);
            expect(stop.args[0][0]).to.equal(1);

            expect(start.callCount).to.equal(1);
            expect(start.args[0][0]).to.equal(2);

            expect(settings.getSelectedView()).to.equal(view2);
            let storedView = await store.get("settings-selected-view")
            expect(storedView).to.equal(view2.name);

            expect(view1Button.className).not.to.contain("active");
            expect(view2Button.className).to.contain("active");

            expect(view1Button.getAttribute("aria-label")).to.equal("View 1 mode disabled");
            expect(view2Button.getAttribute("aria-label")).to.equal("View 2 mode enabled");


            click(view1Button);
            await pause();

            expect(getCurrentPosition.callCount).to.equal(2);
            expect(getCurrentPosition.args[1][0]).to.equal(2);

            expect(stop.callCount).to.equal(2);
            expect(stop.args[1][0]).to.equal(2);

            expect(start.callCount).to.equal(2);
            expect(start.args[1][0]).to.equal(1);

            expect(settings.getSelectedView()).to.equal(view1);
            storedView = await store.get("settings-selected-view")
            expect(storedView).to.equal(view1.name);

            expect(view1Button.className).to.contain("active");
            expect(view2Button.className).not.to.contain("active");

            expect(view1Button.getAttribute("aria-label")).to.equal("View 1 mode enabled");
            expect(view2Button.getAttribute("aria-label")).to.equal("View 2 mode disabled");
        });

        it("renders font size increase and decrease buttons", async () => {
            const element = document.createElement("div");
            settings.renderControls(element);

            let decreaseButton = element.querySelector("button[class='decrease']") as HTMLButtonElement;
            expect(decreaseButton).to.be.ok;
            let increaseButton = element.querySelector("button[class=increase]") as HTMLButtonElement;
            expect(increaseButton).to.be.ok;
            let label = element.querySelector(".font-size-label") as HTMLLIElement;
            expect(label).to.be.ok;

            // If there's no font size or only one font size, font size controls don't show up in settings.

            settings = await BookSettings.create({
                store,
                bookViews: [view1],
                fontSizesInPixels: [12]
            });
            settings.renderControls(element);
            decreaseButton = element.querySelector("button[class='decrease']") as HTMLButtonElement;
            expect(decreaseButton).to.be.null;
            increaseButton = element.querySelector("button[class=increase]") as HTMLButtonElement;
            expect(increaseButton).to.be.null;
            label = element.querySelector(".font-size-label") as HTMLLIElement;
            expect(label).to.be.null;

            settings = await BookSettings.create({
                store,
                bookViews: [view1],
                fontSizesInPixels: []
            });
            settings.renderControls(element);
            decreaseButton = element.querySelector("button[class='decrease']") as HTMLButtonElement;
            expect(decreaseButton).to.be.null;
            increaseButton = element.querySelector("button[class=increase]") as HTMLButtonElement;
            expect(increaseButton).to.be.null;
            label = element.querySelector(".font-size-label") as HTMLLIElement;
            expect(label).to.be.null;
        });

        it("decreases and increases font size", async () => {
            const element = document.createElement("div");
            settings.renderControls(element);

            const decreaseButton = element.querySelector("button[class=decrease]") as HTMLButtonElement;
            const increaseButton = element.querySelector("button[class=increase]") as HTMLButtonElement;

            expect(settings.getSelectedFontSize()).to.equal("14px");

            click(decreaseButton);
            await pause();
            expect(settings.getSelectedFontSize()).to.equal("12px");
            let storedFontSize = await store.get("settings-selected-font-size");
            expect(storedFontSize).to.equal("12px");

            // The decrease button is now disabled because the size can't be decreased more.
            expect(decreaseButton.className).to.contain("disabled");
            expect(increaseButton.className).not.to.contain("disabled");

            // Clicking decrease again does nothing.
            click(decreaseButton);
            await pause();
            expect(settings.getSelectedFontSize()).to.equal("12px");
            storedFontSize = await store.get("settings-selected-font-size");
            expect(storedFontSize).to.equal("12px");

            click(increaseButton);
            await pause();
            expect(settings.getSelectedFontSize()).to.equal("14px");
            storedFontSize = await store.get("settings-selected-font-size");
            expect(storedFontSize).to.equal("14px");

            expect(decreaseButton.className).not.to.contain("disabled");
            expect(increaseButton.className).not.to.contain("disabled");

            click(increaseButton);
            await pause();
            expect(settings.getSelectedFontSize()).to.equal("16px");
            storedFontSize = await store.get("settings-selected-font-size");
            expect(storedFontSize).to.equal("16px");


            expect(decreaseButton.className).not.to.contain("disabled");
            expect(increaseButton.className).to.contain("disabled");

            // Clicking increase again does nothing.
            click(increaseButton);
            await pause();
            expect(settings.getSelectedFontSize()).to.equal("16px");
            storedFontSize = await store.get("settings-selected-font-size");
            expect(storedFontSize).to.equal("16px");
        });

        it("renders offline status", async () => {
            const element = document.createElement("div");
            settings.renderControls(element);

            const offlineStatus = element.querySelector("div[class='offline-status']") as HTMLDivElement;
            expect(offlineStatus).not.to.be.null;
        });

        it("blocks click events for container element when something in the ul is clicked", () => {
            let clickEventTriggered: boolean = false;
            const element = document.createElement("div");
            element.addEventListener("click", () => {
                clickEventTriggered = true;
            });

            settings.renderControls(element);
            const increaseButton = element.querySelector("button[class=increase]") as HTMLButtonElement;
            click(increaseButton);
            expect(clickEventTriggered).to.equal(false);

            const ul = element.querySelector("ul") as HTMLUListElement;
            click(ul);
            expect(clickEventTriggered).to.equal(false);

            click(element);
            expect(clickEventTriggered).to.equal(true);
        });
    });

    describe("#onViewChange", () => {
        it("sets up view change callback", async () => {
            const element = document.createElement("div");
            settings.renderControls(element);

            const viewChanged = stub();
            settings.onViewChange(viewChanged);

            const view1Button = element.querySelector("button[class='view1 active']") as HTMLButtonElement;
            const view2Button = element.querySelector("button[class=view2]") as HTMLButtonElement;

            click(view2Button);
            await pause();
            expect(viewChanged.callCount).to.equal(1);

            click(view1Button);
            await pause();
            expect(viewChanged.callCount).to.equal(2);
        });
    });

    describe("#onFontSizeChange", () => {
        it("sets up font change callback", async () => {
            const element = document.createElement("div");
            settings.renderControls(element);

            const fontSizeChanged = stub();
            settings.onFontSizeChange(fontSizeChanged);

            const decreaseButton = element.querySelector("button[class=decrease]") as HTMLButtonElement;
            const increaseButton = element.querySelector("button[class=increase]") as HTMLButtonElement;

            click(decreaseButton);
            await pause();
            expect(fontSizeChanged.callCount).to.equal(1);

            click(increaseButton);
            await pause();
            expect(fontSizeChanged.callCount).to.equal(2);
        });
    });
});
