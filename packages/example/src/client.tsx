import {
    createContext,
    getImmediateValue,
    list,
    render,
    useDerived,
    useHookLifetime,
    useState,
    when,
} from "@vortexjs/core";
import { html } from "@vortexjs/dom";
import { layout } from "@vortexjs/move";

const TestingContext = createContext<string>("TestingContext");

function TestingComponent() {
    const ctxData = TestingContext.use();

    return <p>This is a testing component. Context data: {ctxData}</p>;
}

function LayoutTest() {
    const targetValue = useState(0);
    const lt = useHookLifetime();

    return (
        <>
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "200px",
                    height: "200px",
                    backgroundColor: "#eee",
                }}
            >
                <button type="button" use={layout()}>
                    Test
                </button>
            </div>
            <div className="resizer">
                {list(
                    "Fugiat reprehenderit occaecat aute id esse enim ea labore do minim amet velit deserunt exercitation. Minim esse voluptate fugiat est non et fugiat amet duis.".split(
                        " ",
                    ),
                ).show((x, _i) => (
                    <>
                        <span
                            className="inline-char"
                            use={layout({ spring: { weight: 0.05 } })}
                        >
                            {x}
                        </span>
                        <span> </span>
                    </>
                ))}
            </div>
        </>
    );
}

function PopupTest() {
    const isOpen = useState(false);

    return (
        <>
            <button
                type="button"
                on:click={() => {
                    isOpen.set(!getImmediateValue(isOpen));
                }}
                use={layout({ id: "popupButton", spring: { weight: 0.5 } })}
            >
                Toggle Popup
            </button>
            {when(isOpen, () => (
                <div
                    className="popup"
                    use={layout({ startsFrom: "popupButton" })}
                >
                    This is a popup!
                </div>
            ))}
        </>
    );
}

function App() {
    const counter = useState(0);
    const name = useState("multiverse");

    const numbersToCounter = useDerived((get) => {
        const currentCounter = get(counter);
        return Array.from({ length: currentCounter }, (_, i) => i + 1);
    });

    return (
        <>
            <TestingContext value="Hello from Testing Context!">
                <TestingComponent />
            </TestingContext>
            <p>
                Counter = {counter}, Name = {name}
            </p>
            <label>
                Name
                <input type="text" bind:value={name} />
            </label>
            <button
                on:click={() => {
                    counter.set(getImmediateValue(counter) + 100);
                }}
                type="button"
            >
                Increment
            </button>

            {when(
                useDerived((get) => get(counter) % 2 === 0),
                () => (
                    <p>{counter} is an even number</p>
                ),
            )}

            {list(numbersToCounter).show((number) => (
                <p>
                    {number} is a number from 1 to {counter}
                </p>
            ))}

            <LayoutTest />
            <PopupTest />
        </>
    );
}

render(html(), document.body, <App />);
