export interface Box {
	top: number;
	left: number;
	width: number;
	height: number;
}

export function getElementAbsoluteTransform(element: HTMLElement): DOMMatrix {
	const style = getComputedStyle(element);
	const transform = style.transform || "none";
	const matrix = new DOMMatrix(transform);

	if (element.parentElement) {
		matrix.preMultiplySelf(getElementAbsoluteTransform(element.parentElement));
	}

	return matrix;
}

export function projectElementToBox(
	element: HTMLElement,
	target: Box
) {
	element.style.transform = "";

	const currentRect = element.getBoundingClientRect();

	const translateX = (
		target.left + target.width / 2
	) - (currentRect.left + currentRect.width / 2);
	const translateY = (
		target.top + target.height / 2
	) - (currentRect.top + currentRect.height / 2);
	let scaleX = target.width / currentRect.width;
	let scaleY = target.height / currentRect.height;

	if (!Number.isFinite(scaleX)) {
		scaleX = 1;
	}

	if (!Number.isFinite(scaleY)) {
		scaleY = 1;
	}

	const matrix = new DOMMatrix()
		.translate(translateX, translateY)
		.scale(scaleX, scaleY);

	if (element.parentElement) {
		matrix.preMultiplySelf(getElementAbsoluteTransform(element.parentElement).inverse());
	}

	element.style.transform = matrix.toString();
}
