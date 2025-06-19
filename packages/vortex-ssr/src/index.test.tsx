import { expect, test } from "bun:test";
import { render } from "@vortexjs/core";
import {
	createCodegenStream,
	createHTMLRoot,
	diffInto,
	printHTML,
	ssr,
} from ".";

function App() {
	return (
		<>
			<head>
				<title>Test Page </title>
				<meta name="description" content="This is a test page." />
			</head>
			<body>
				<h1 style={{ backgroundColor: "red" }}> Hello, World! </h1>
			</body>
		</>
	);
}

function App2() {
	return (
		<>
			<body>
				<h1> Hello, multiverse! </h1>
				<p>I hope you like my website, I worked really hard on it!!!</p>
			</body>
			<head>
				<title>Test Page </title>
				<meta name="description" content="This is a test page." />
			</head>
		</>
	);
}

test("html printing", () => {
	const root = createHTMLRoot();

	render(ssr(), root, <App />);

	expect(printHTML(root)).toMatchInlineSnapshot(
		`"<html><head><title>Test Page </title><meta name="description" content="This is a test page."></meta></head><body><h1 style="background-color: red;"> Hello, World! </h1></body></html>"`,
	);
});

test("html diffing", () => {
	const root = createHTMLRoot();

	render(ssr(), root, <App />);

	const root2 = createHTMLRoot();

	render(ssr(), root2, <App2 />);

	const codegen = createCodegenStream();

	diffInto(root, root2, codegen);

	expect(codegen.getCode()).toMatchInlineSnapshot(
		`"var $0=document.documentElement;var $1="insertBefore";var $2="childNodes";var $3=$0[$2][1];var $4=$0[$2][0];$0[$1]($3, $4);var $5="appendChild";var $6="createElement";$3[$5](document[$6]("p"));var $7=$3[$2][0];var $8="removeAttribute";$7[$8]("style");var $9=$7[$2][0];var $a="textContent";$9[$a] = " Hello, multiverse! ";var $b="createTextNode";document[$b]("");var $c=$3[$2][1];var $d=$c[$2][0];$d[$a] = "I hope you like my website, I worked really hard on it!!!";"`,
	);
});
