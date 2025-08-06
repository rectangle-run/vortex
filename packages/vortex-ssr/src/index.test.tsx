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
	`"<html><head><title>Test Page </title><meta name="description" content="This is a test page."></meta></head><body><h1 style="background-color: red;"> Hello, World! </h1></body></html>"`);
});

test("html diffing", () => {
	const root = createHTMLRoot();

	render(ssr(), root, <App />);

	const root2 = createHTMLRoot();

	render(ssr(), root2, <App2 />);

	const codegen = diffInto(root, root2);

	expect(codegen.getCode()).toMatchInlineSnapshot(
	`"var $0=document.documentElement;var $1="insertBefore";var $2=document.body;var $3=document.head;$0[$1]($2, $3);var $4="appendChild";var $5="createElement";$2[$4](document[$5]("p"));var $6="querySelectorAll";var $7="h1";var $8=document[$6]($7)[0];var $9="removeAttribute";$8[$9]("style");var $a="childNodes";var $b=$8[$a][0];var $c="textContent";$b[$c] = " Hello, multiverse! ";var $d="p";var $e=document[$6]($d)[0];var $f="createTextNode";$e[$4](document[$f](""));var $g=$e[$a][0];$g[$c] = "I hope you like my website, I worked really hard on it!!!";"`);
});
