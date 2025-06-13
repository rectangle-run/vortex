//
//   Serializer
//

import { unwrap } from "./utils";

export interface Serializer {
	internalBuffer: DataView;
	position: number;
	valueTable: any[];
	writtenValues: number;
}

export function serializer_new(): Serializer {
	return {
		internalBuffer: new DataView(new ArrayBuffer(1024)),
		position: 0,
		valueTable: [],
		writtenValues: 0,
	};
}

export function serializer_alloc(
	serializer: Serializer,
	additionalSize: number,
): void {
	const minimumSize = serializer.position + additionalSize;
	let newLength = serializer.internalBuffer.buffer.byteLength;

	while (newLength < minimumSize) {
		newLength *= 2;
	}

	if (newLength !== serializer.internalBuffer.byteLength) {
		const newBuffer = new ArrayBuffer(newLength);
		const newView = new DataView(newBuffer);
		new Uint8Array(newBuffer).set(
			new Uint8Array(serializer.internalBuffer.buffer),
		);
		serializer.internalBuffer = newView;
	}
}

export function serializer_getBytes(serializer: Serializer): Uint8Array {
	return new Uint8Array(
		serializer.internalBuffer.buffer.slice(0, serializer.position),
	);
}

export function serializer_writeInt(
	serializer: Serializer,
	value: number,
): void {
	serializer_alloc(serializer, 4);
	serializer.internalBuffer.setInt32(serializer.position, value, true);
	serializer.position += 4;
}

export function serializer_writeString(
	serializer: Serializer,
	value: string,
): void {
	const encoder = new TextEncoder();
	const encoded = encoder.encode(value);
	const length = encoded.length;

	serializer_alloc(serializer, 4 + length);
	serializer.internalBuffer.setInt32(serializer.position, length, true);
	serializer.position += 4;
	new Uint8Array(serializer.internalBuffer.buffer).set(
		encoded,
		serializer.position,
	);
	serializer.position += length;
}

export function serializer_writeByteArray(
	serializer: Serializer,
	value: Uint8Array,
): void {
	const length = value.length;

	serializer_alloc(serializer, 4 + length);
	serializer.internalBuffer.setInt32(serializer.position, length, true);
	serializer.position += 4;
	new Uint8Array(serializer.internalBuffer.buffer).set(
		value,
		serializer.position,
	);
	serializer.position += length;
}

export function serializer_writeFloat(
	serializer: Serializer,
	value: number,
): void {
	serializer_alloc(serializer, 4);
	serializer.internalBuffer.setFloat32(serializer.position, value, true);
	serializer.position += 4;
}

export function serializer_writeByte(
	serializer: Serializer,
	value: number,
): void {
	serializer_alloc(serializer, 1);
	serializer.internalBuffer.setUint8(serializer.position, value);
	serializer.position += 1;
}

export const SerializerOpcodes = {
	PrimitiveUndefined: 0x00,
	PrimitiveNull: 0x01,
	PrimitiveTrue: 0x02,
	PrimitiveFalse: 0x03,
	PrimitiveInt: 0x04,
	PrimitiveFloat: 0x05,
	PrimitiveString: 0x06,

	StructureObject: 0x10,
	StructureArray: 0x11,

	RuntimeDate: 0x20,
	RuntimeUint8Array: 0x21,
};

export function serializer_getVTableId(
	serializer: Serializer,
	value: any,
): number {
	const index = serializer.valueTable.indexOf(value);
	if (index !== -1) {
		return index;
	}
	serializer.valueTable.push(value);
	return serializer.valueTable.length - 1;
}

export function serializer_writeValue(serializer: Serializer) {
	const value = serializer.valueTable[serializer.writtenValues];
	serializer.writtenValues += 1;

	const units = [
		[null, SerializerOpcodes.PrimitiveNull],
		[true, SerializerOpcodes.PrimitiveTrue],
		[false, SerializerOpcodes.PrimitiveFalse],
		[undefined, SerializerOpcodes.PrimitiveUndefined],
	] as const;

	for (const [unitValue, opcode] of units) {
		if (value === unitValue) {
			serializer_writeByte(serializer, opcode);
			return;
		}
	}

	if (typeof value === "number") {
		if (Number.isInteger(value)) {
			serializer_writeByte(serializer, SerializerOpcodes.PrimitiveInt);
			serializer_writeInt(serializer, value);
		} else {
			serializer_writeByte(serializer, SerializerOpcodes.PrimitiveFloat);
			serializer_writeFloat(serializer, value);
		}
		return;
	}

	if (typeof value === "string") {
		serializer_writeByte(serializer, SerializerOpcodes.PrimitiveString);
		serializer_writeString(serializer, value);
		return;
	}

	if (value instanceof Date) {
		serializer_writeByte(serializer, SerializerOpcodes.RuntimeDate);
		serializer_writeInt(serializer, value.getTime());
		return;
	}

	if (value instanceof Uint8Array) {
		serializer_writeByte(serializer, SerializerOpcodes.RuntimeUint8Array);
		serializer_writeByteArray(serializer, value);
		return;
	}

	if (Array.isArray(value)) {
		serializer_writeByte(serializer, SerializerOpcodes.StructureArray);
		serializer_writeInt(serializer, value.length);
		for (const item of value) {
			const vtableId = serializer_getVTableId(serializer, item);
			serializer_writeInt(serializer, vtableId);
		}
		return;
	}

	if (typeof value === "object" && value !== null) {
		serializer_writeByte(serializer, SerializerOpcodes.StructureObject);
		const keys = Object.keys(value);
		serializer_writeInt(serializer, keys.length);
		for (const key of keys) {
			const vtableId = serializer_getVTableId(serializer, value[key]);
			serializer_writeInt(serializer, vtableId);
			const keyVtableId = serializer_getVTableId(serializer, key);
			serializer_writeInt(serializer, keyVtableId);
		}
		return;
	}
}

export function serializer_serialize(
	serializer: Serializer,
	value: any,
): Uint8Array {
	serializer.valueTable.push(value);

	while (serializer.writtenValues < serializer.valueTable.length) {
		serializer_writeValue(serializer);
	}

	return serializer_getBytes(serializer);
}

//
//   Deserializer
//

export interface Deserializer {
	internalBuffer: DataView;
	position: number;
	valueTable: any[];
	positionTable: number[];
}

export function deserializer_new(buffer: Uint8Array): Deserializer {
	return {
		internalBuffer: new DataView(
			buffer.buffer,
			buffer.byteOffset,
			buffer.byteLength,
		),
		position: 0,
		valueTable: [],
		positionTable: [],
	};
}

export function deserializer_readInt(deserializer: Deserializer): number {
	const value = deserializer.internalBuffer.getInt32(
		deserializer.position,
		true,
	);
	deserializer.position += 4;
	return value;
}

export function deserializer_readString(deserializer: Deserializer): string {
	const length = deserializer_readInt(deserializer);
	const bytes = new Uint8Array(
		deserializer.internalBuffer.buffer,
		deserializer.position,
		length,
	);
	deserializer.position += length;
	return new TextDecoder().decode(bytes);
}

export function deserializer_readByteArray(
	deserializer: Deserializer,
): Uint8Array {
	const length = deserializer_readInt(deserializer);
	const bytes = new Uint8Array(
		deserializer.internalBuffer.buffer,
		deserializer.position,
		length,
	);
	deserializer.position += length;
	return bytes;
}

export function deserializer_readFloat(deserializer: Deserializer): number {
	const value = deserializer.internalBuffer.getFloat32(
		deserializer.position,
		true,
	);
	deserializer.position += 4;
	return value;
}

export function deserializer_readByte(deserializer: Deserializer): number {
	const value = deserializer.internalBuffer.getUint8(deserializer.position);
	deserializer.position += 1;
	return value;
}

export function deserializer_unlinkedPass_readValue(
	deserializer: Deserializer,
): any {
	const type = deserializer_readByte(deserializer);

	switch (type) {
		case SerializerOpcodes.PrimitiveUndefined:
			return undefined;
		case SerializerOpcodes.PrimitiveNull:
			return null;
		case SerializerOpcodes.PrimitiveTrue:
			return true;
		case SerializerOpcodes.PrimitiveFalse:
			return false;
		case SerializerOpcodes.PrimitiveInt:
			return deserializer_readInt(deserializer);
		case SerializerOpcodes.PrimitiveFloat:
			return deserializer_readFloat(deserializer);
		case SerializerOpcodes.PrimitiveString:
			return deserializer_readString(deserializer);
		case SerializerOpcodes.RuntimeDate:
			return new Date(deserializer_readInt(deserializer));
		case SerializerOpcodes.RuntimeUint8Array:
			return deserializer_readByteArray(deserializer);
		case SerializerOpcodes.StructureArray: {
			const length = deserializer_readInt(deserializer);
			deserializer.position += length * 4; // Skip over vtable IDs
			return [];
		}
		case SerializerOpcodes.StructureObject: {
			const length = deserializer_readInt(deserializer);
			deserializer.position += length * 8;
			return {};
		}
		default:
			throw new Error(`Unknown type code: ${type}`);
	}
}

export function deserializer_linkedPass_updateValue(
	deserializer: Deserializer,
	value: any,
): void {
	const type = deserializer_readByte(deserializer);

	switch (type) {
		case SerializerOpcodes.PrimitiveUndefined:
		case SerializerOpcodes.PrimitiveNull:
		case SerializerOpcodes.PrimitiveTrue:
		case SerializerOpcodes.PrimitiveFalse:
		case SerializerOpcodes.PrimitiveInt:
		case SerializerOpcodes.PrimitiveFloat:
		case SerializerOpcodes.PrimitiveString:
		case SerializerOpcodes.RuntimeDate:
		case SerializerOpcodes.RuntimeUint8Array:
			break;
		case SerializerOpcodes.StructureArray: {
			const length = deserializer_readInt(deserializer);
			for (let i = 0; i < length; i++) {
				const vtableId = deserializer_readInt(deserializer);
				value[i] = deserializer.valueTable[vtableId];
			}
			break;
		}
		case SerializerOpcodes.StructureObject: {
			const length = deserializer_readInt(deserializer);
			const obj: Record<string, any> = {};
			for (let i = 0; i < length; i++) {
				const vtableId = deserializer_readInt(deserializer);
				const keyVtableId = deserializer_readInt(deserializer);
				obj[deserializer.valueTable[keyVtableId]] =
					deserializer.valueTable[vtableId];
			}
			deserializer.valueTable.push(obj);
			break;
		}
	}
}

export function deserializer_deserialize(deserializer: Deserializer): any {
	while (deserializer.position < deserializer.internalBuffer.byteLength) {
		deserializer.positionTable.push(deserializer.position);
		const value = deserializer_unlinkedPass_readValue(deserializer);
		deserializer.valueTable.push(value);
	}

	for (let i = 0; i < deserializer.valueTable.length; i++) {
		deserializer.position = unwrap(deserializer.positionTable[i]);
		deserializer_linkedPass_updateValue(
			deserializer,
			deserializer.valueTable[i],
		);
	}

	return deserializer.valueTable[0];
}

// Nice external API
export function serialize(value: any): Uint8Array {
	const serializer = serializer_new();
	return serializer_serialize(serializer, value);
}

export function deserialize(buffer: Uint8Array): any {
	const deserializer = deserializer_new(buffer);
	return deserializer_deserialize(deserializer);
}
