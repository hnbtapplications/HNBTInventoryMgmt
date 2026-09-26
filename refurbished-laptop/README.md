# Hertz & Bytes — Refurbished Laptop Stock Movement

This version includes a two-step laptop workflow, component-condition fields, dedicated port testing, Bangalore/Hosur stock locations, reports, and editable stock movements with correction history.

## Branding and login
- The interface follows the Hertz & Bytes website styling with the official company logo, white navigation, Poppins-style typography and blue `#0078D4` accents.
- A dedicated login screen protects access during the browser session, with Sign Out available in the sidebar.
- This downloadable version uses client-side session authentication. For secure multi-user deployment, move authentication to Supabase before publishing publicly.

## Two-step laptop workflow
- **Add Laptop** is a dedicated page containing only Basic Information, Configuration, and Stock / Receipt. It is intended for the initial receipt and configuration entry.
- **Add / Update Product Condition** is a separate page. Type or select a Laptop ID to load its Brand, Model and Configuration, then update Battery, Performance & Hardware Tests, Keyboard / Input, Connectivity & Multimedia, and Physical Condition.
- Keyboard Backlight is limited to Yes or No.
- Top Case with Bazel, Keyboard Condition, Touchpad, Bottom Case, Hinges Condition, Trackpad, and Overall Cosmetic Status use the same four choices: Good (No Scratches), Minor Scratches, Damaged (Need to be Replaced), or Replaced.

## Component condition options
The editor provides selectable options for:
- CPU Stress Test
- RAM Diagnostics
- Drive Health Status
- Graphics Stability Test
- Keyboard Mechanical Check
- Keyboard Backlight
- Trackpad Responsiveness
- HDMI, USB-A 2.0, USB-A 3.0 and USB-C
- USB-C charging and display output
- Audio jack, SD card reader and LAN/RJ45
- Webcam Functionality
- Wi-Fi Connectivity
- Bluetooth Pair Test
- Internal Speakers Status
- Microphone Audio Quality
- Display Panel Grade
- Overall Cosmetic Status
- Battery Health / Cycle Count / Backup Time
- RAM, storage and processor configuration
- Stock Status
- Bangalore / Hosur location and receipt details
- Physical condition for top case with bazel, keyboard, touchpad, bottom case, trackpad and hinges

## Stock movement routes
- Supplier → Bangalore
- Supplier → Hosur
- Bangalore → Hosur
- Hosur → Bangalore
- Bangalore → Customer
- Hosur → Customer

Use the pencil button to correct a movement. The history button shows every saved version so corrections do not silently replace the audit trail.

The New Stock Movement form is divided into Stock Transfer and Sales. Laptop ID supports typing/search, the current location is filled automatically, transfers require a destination, and sales capture invoice, amount, payment date, payment mode and remarks. The destination field is shown only for Stock Transfer.

Product Type has been replaced by a free-text Configuration description. The same description is shown when recording Transfers and Sales.

The Reports page includes complete details for a selected Laptop ID, Sales movements for a selected period, and location-wise Stock in Hand with basic information and configuration.

Laptop Inventory displays the laptop's current Bangalore or Hosur location instead of the Cosmetic column.

Basic Information and Configuration are mandatory. Processor and RAM sizes use fixed dropdowns, Power Adapter Type is included, Stock Status is limited to the four required workflow states, and Stock/Receipt uses Remarks without repeating Location.

RAM Slot 2 and Storage 2 fields are optional. Backup JSON and Import Excel controls have been removed. Reports now include a condition-based laptop list filtered by Processor, RAM, Storage Type and defective spare/component.

The software keeps the exact Excel fields while adding dropdowns to standardize entries. Free-text fields remain editable.

## Run in VS Code
```bash
npm install
npm run dev
```

## Important
This prototype stores data in browser localStorage. For company-wide multi-user operation, the next step is Supabase authentication + database + audit history, then Vercel deployment.
