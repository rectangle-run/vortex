const timeUnits = {
	s: 1000,
	ms: 1,
	m: 60 * 1000,
	h: 60 * 60 * 1000,
	d: 24 * 60 * 60 * 1000,
	w: 7 * 24 * 60 * 60 * 1000,
	y: 365 * 24 * 60 * 60 * 1000,
} as const;

type TimeUnit = keyof typeof timeUnits;

export type TimeSpec = `${number}${TimeUnit}`;

export function time(time: TimeSpec): { ms: number } {
	let numberPortion = "";
	let unitPortion = "";

	for (const char of time) {
		if (char >= "0" && char <= "9") {
			if (unitPortion.length > 0) {
				throw new Error(`Invalid time spec: ${time}`);
			}
			numberPortion += char;
		} else {
			unitPortion += char;
		}
	}

	if (numberPortion.length === 0 || unitPortion.length === 0) {
		throw new Error(`Invalid time spec: ${time}`);
	}

	const numberValue = Number.parseInt(numberPortion, 10);
	const unitValue = timeUnits[unitPortion as TimeUnit];

	if (Number.isNaN(numberValue) || unitValue === undefined) {
		throw new Error(`Invalid time spec: ${time}`);
	}

	return { ms: numberValue * unitValue };
}
