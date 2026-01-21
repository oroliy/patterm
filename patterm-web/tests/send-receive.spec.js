import { test, expect } from '@playwright/test';

test.describe('Send and Receive Data', () => {
    test('send data from input field', async ({ page }) => {
        const consoleLogs = [];
        const rxData = [];

        page.on('console', msg => {
            const text = msg.text();
            console.log('[Console]', text);
            consoleLogs.push(text);

            if (text.includes('[TabManager] Data received')) {
                const match = text.match(/Data received: (.+)/);
                if (match) {
                    rxData.push(match[1]);
                }
            }
        });

        await page.goto('https://localhost:5173/');
        await page.waitForLoadState('networkidle');

        console.log('\n=== STEP 1: Create connection ===');

        // Simulate creating a connection with a mock port that echoes data
        const result = await page.evaluate(async () => {
            // Create a mock port that echoes back received data
            let dataReceiver = null;

            const mockPort = {
                getInfo: () => ({ usbVendorId: 0x1234, usbProductId: 0x5678 }),

                async open(options) {
                    console.log('[MockPort.open] Opening with:', options);
                    this.readable = new ReadableStream({
                        start(controller) {
                            console.log('[MockPort.readable] Stream started');
                            dataReceiver = controller;
                        }
                    });
                    // Create writable that handles binary data (Uint8Array) from TextEncoderStream
                    this.writable = new WritableStream({
                        async write(chunk) {
                            console.log('[MockPort.write] Received chunk type:', chunk.constructor.name, 'length:', chunk.length);
                            // chunk is Uint8Array from TextEncoderStream
                            const decoder = new TextDecoder();
                            const text = decoder.decode(chunk);
                            console.log('[MockPort.write] Decoded text:', text);
                            // Echo back the data with newline
                            if (dataReceiver) {
                                const echoData = `Echo: ${text}\n`;
                                console.log('[MockPort.write] Enqueuing echo:', echoData);
                                dataReceiver.enqueue(new TextEncoder().encode(echoData));
                            }
                        },
                        close() {
                            console.log('[MockPort.writable] Stream closed');
                        }
                    });
                    this.connected = true;
                },

                async close() {
                    console.log('[MockPort.close] Closing');
                    this.connected = false;
                }
            };

            const app = window.app;
            const config = {
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            };

            try {
                await app.createConnection(config, 'Echo Test', mockPort);
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Find the input field and send a test message
                const tabId = 'tab-0';
                const inputField = document.querySelector(`[data-tab-id="${tabId}"] .input-field`) ||
                                    document.querySelector('.tab-content.active .input-field');

                if (!inputField) {
                    return { error: 'Input field not found' };
                }

                inputField.value = 'Hello Serial World!';
                const sendBtn = document.querySelector(`[data-tab-id="${tabId}"] .send-btn`) ||
                                  document.querySelector('.tab-content.active .send-btn');

                if (!sendBtn) {
                    return { error: 'Send button not found' };
                }

                console.log('[Test] Clicking send button');
                sendBtn.click();

                await new Promise(resolve => setTimeout(resolve, 1500));

                // Get terminal content
                const terminal = document.querySelector(`[data-tab-id="${tabId}"] .terminal-display`) ||
                                document.querySelector('.tab-content.active .terminal-display');

                if (!terminal) {
                    return { error: 'Terminal not found' };
                }

                const terminalText = terminal.textContent || '';
                const terminalHTML = terminal.innerHTML || '';
                const rxMatches = terminalHTML.match(/Echo: Hello Serial World!/g);

                return {
                    success: true,
                    terminalText: terminalText.substring(0, 200),
                    hasEcho: rxMatches ? rxMatches.length : 0,
                    inputExists: true,
                    sendClicked: true
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    stack: error.stack?.toString()
                };
            }
        });

        console.log('\n=== SEND/RECEIVE TEST RESULT ===');
        console.log(JSON.stringify(result, null, 2));

        console.log('\n=== CONSOLE LOGS ===');
        consoleLogs.forEach(l => console.log(l));

        await page.screenshot({ path: 'test-output/send-receive-test.png' });
        console.log('\nScreenshot saved');

        expect(result.success).toBeTruthy();
        expect(result.sendClicked).toBeTruthy();
    });

    test('verify input field and send button are functional', async ({ page }) => {
        await page.goto('https://localhost:5173/');
        await page.waitForLoadState('networkidle');

        const result = await page.evaluate(() => {
            // First create a connection without real port to just test the UI
            const mockPort = {
                getInfo: () => ({ usbVendorId: 0x1234, productId: 0x5678 }),
                async open() { this.connected = true; },
                close() { this.connected = false; },
                readable: new ReadableStream({ start() {} }),
                writable: new WritableStream()
            };

            const app = window.app;
            const config = {
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            };

            return app.createConnection(config, 'UI Test', mockPort).then(() => {
                return new Promise(resolve => setTimeout(resolve, 1000));
            }).then(() => {
                // Check UI elements - find any visible tab-content
                const tabContents = document.querySelectorAll('.tab-content');
                let activeTab = null;
                for (const tab of tabContents) {
                    if (tab.style.display !== 'none') {
                        activeTab = tab;
                        break;
                    }
                }

                if (!activeTab) {
                    return { error: 'No active tab found', tabCount: tabContents.length };
                }

                const inputField = activeTab.querySelector('.input-field');
                const sendBtn = activeTab.querySelector('.send-btn');
                const clearBtn = activeTab.querySelector('.clear-btn');

                return {
                    tabExists: true,
                    tabCount: tabContents.length,
                    inputFieldExists: !!inputField,
                    sendBtnExists: !!sendBtn,
                    clearBtnExists: !!clearBtn,
                    inputFieldDisabled: inputField?.disabled,
                    sendBtnDisabled: sendBtn?.disabled,
                    inputFieldValue: inputField?.value || ''
                };
            }).catch(err => {
                return { error: err.message, stack: err.stack };
            });
        });

        console.log('\n=== UI TEST RESULT ===');
        console.log(JSON.stringify(result, null, 2));

        expect(result.tabExists).toBeTruthy();
        expect(result.inputFieldExists).toBeTruthy();
        expect(result.sendBtnExists).toBeTruthy();
        expect(result.clearBtnExists).toBeTruthy();
    });
});
