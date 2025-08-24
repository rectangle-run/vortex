export interface StreamUtility {
	write(data: string): Promise<void>;
	end(): Promise<void>;
	readable: ReadableStream<string>;
}

export function INTERNAL_createStreamUtility(): StreamUtility {
	let streamController: ReadableStreamDefaultController<string>;
	const readable = new ReadableStream<string>({
		start(controller) {
			streamController = controller;
		}
	});
	return {
		write(data: string): Promise<void> {
			return new Promise(resolve => {
				streamController.enqueue(data);
				resolve();
			});
		},
		end(): Promise<void> {
			return new Promise(resolve => {
				streamController.close();
				resolve();
			});
		},
		readable
	};
}
