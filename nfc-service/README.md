# R20C-USB NFC Reader Integration

The R20C-USB is a **keyboard emulation** NFC reader - it acts like a keyboard and types data directly into input fields. No drivers or backend service required!

## How It Works

1. When you click "Start NFC Scan", a hidden input field gets focus
2. Place your MyKad on the R20C-USB reader
3. The reader types the card data (usually IC number) into the input field
4. The React app captures and parses the data automatically

## Setup

**No installation required!** Just:
1. Plug in your R20C-USB reader via USB
2. Windows will recognize it as a keyboard device
3. That's it! No drivers needed.

## Usage

1. Navigate to contract creation in the React app
2. When you reach the NFC scan step, click "Start NFC Scan"
3. **Important**: Click the button first, then place your MyKad on the reader
4. The reader will type the IC number automatically
5. The app will parse and display the data

## Data Format

The R20C-USB typically outputs the IC number in one of these formats:
- `901212101234` (12 digits, no dashes)
- `901212-10-1234` (with dashes)
- `901212 10 1234` (with spaces)

The app automatically parses any of these formats.

## Troubleshooting

### Reader Not Typing
- Make sure you clicked "Start NFC Scan" first (this focuses the hidden input)
- Ensure the reader is properly connected via USB
- Try unplugging and reconnecting the reader
- Check if the reader LED lights up when card is placed

### Data Not Captured
- Ensure the browser tab/window is active and focused
- Don't click away from the page while scanning
- Make sure no other input field has focus
- Try clicking "Start NFC Scan" again

### Wrong Data Format
- The reader might output data in a different format
- Check what the reader actually types (you can test in Notepad)
- We may need to adjust the parsing logic based on your reader's output format

## Notes

- **No backend service needed** - everything works in the browser
- The reader must type data within 10 seconds after clicking Start
- Make sure the browser window is focused when scanning
- The hidden input field automatically gets focus when scanning starts

