# Hertz & Bytes Inventory Extension

This is a React/Vite prototype for extending the quotation workflow with Product / Inventory Management.

## What is included

- Product master
- Product ID / SKU / HSN / category / brand
- Purchase and selling price
- Minimum stock level
- Bangalore and Hosur branch stock
- Total stock and stock valuation
- Low-stock and out-of-stock status
- Search and category/branch filters
- Stock In / Stock Out
- Stock movement history
- Edit / delete products
- CSV export
- Browser localStorage persistence

## Run on Windows

1. Install Node.js LTS from https://nodejs.org/
2. Extract this ZIP.
3. Open the extracted folder in Visual Studio Code.
4. Open Terminal > New Terminal.
5. Run:

npm install

6. Then run:

npm run dev

7. Open the localhost address shown by Vite, normally:

http://localhost:5173

## Important integration note

The supplied quotation URL is a deployed Vercel application. A deployed URL alone does not expose its source code. This project is therefore a standalone inventory module/prototype.

To make `/inventory` a true extension of the existing quotation application, the original quotation project's source code/repository needs to be used. The inventory page can then be added as a route and the Product Master can be connected to the quotation item selector.

Recommended final data flow:

Product Master -> Inventory -> Quotation Item Selector
                       -> Stock In/Out
Quotation -> Sales/Invoice -> Stock Out
Purchase/GRN -> Stock In
Branch Transfer -> Bangalore/Hosur adjustment

For production use, replace localStorage with a shared database such as Supabase/PostgreSQL so Bangalore and Hosur users see the same live stock.
