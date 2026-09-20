/** @typedef {"Need to be Checked"|"Spares Need to be Replaced"|"Ready for Sale"|"Sold"|"Scrap"} RefurbStockStatus */
/** @typedef {"Bangalore"|"Hosur"} RefurbLocation */
/** @typedef {"Low"|"Normal"|"High"|"Critical"} RepairPriority */
/** @typedef {"Awaiting Parts"|"In Repair"|"Ready for QC"|"Completed"|"Cancelled"} RepairStatus */
/** @typedef {"Required"|"Ordered"|"Received"|"Consumed"|"Returned"|"Cancelled"} RepairPartStatus */
/**
 * @typedef {Object} RefurbLaptop
 * @property {string} __dbId
 * @property {string} "Laptop ID"
 * @property {string} Brand
 * @property {string} Model
 * @property {string} "Serial Number"
 * @property {string} Configuration
 * @property {RefurbLocation} Location
 * @property {string} Processor
 * @property {string} "Processor Gen"
 * @property {string} "RAM Slot 1 Size (GB)"
 * @property {string} "RAM Slot 1 Type"
 * @property {string} "RAM Slot 2 Size (GB)"
 * @property {string} "RAM Slot 2 Type"
 * @property {string} "Storage 1 Capacity"
 * @property {string} "Storage 1 Type"
 * @property {string} "Storage 2 Capacity"
 * @property {string} "Storage 2 Type"
 * @property {string} "Screen Size"
 * @property {string} "Power Adapter Type"
 * @property {RefurbStockStatus} "Stock Status"
 * @property {string} "Date Received"
 * @property {string} "Purchase / Reference No."
 * @property {string} Remarks
 * @property {Record<string,{status?:string,note?:string}>} condition_data
 */
/**
 * @typedef {Object} RepairPart
 * @property {string} [id]
 * @property {string} repair_job_id
 * @property {string} part_name
 * @property {string|null} [part_number]
 * @property {string|null} [supplier]
 * @property {string|null} [reference_no]
 * @property {number|string} required_qty
 * @property {number|string} consumed_qty
 * @property {number|string} unit_cost
 * @property {RepairPartStatus} status
 * @property {string|null} [notes]
 */
/**
 * @typedef {Object} RepairJob
 * @property {string} [id]
 * @property {string} laptop_id
 * @property {string|null} technician
 * @property {RepairPriority} priority
 * @property {RepairStatus} status
 * @property {string|null} target_date
 * @property {string|null} started_at
 * @property {string|null} completed_at
 * @property {number|string|null} estimated_cost
 * @property {number|string|null} actual_cost
 * @property {string|null} parts_reference
 * @property {string|null} diagnosis
 * @property {string|null} action_taken
 * @property {string|null} notes
 * @property {number} version_no
 * @property {RepairPart[]} parts
 */
/** @typedef {{id:string,laptop_id:string,event_type:string,event_status:string|null,from_status:string|null,to_status:string|null,from_location:string|null,to_location:string|null,reference_id:string|null,details:Record<string,unknown>,created_by:string|null,created_at:string}} LifecycleEvent */
export const REFURB_STATUS=["Need to be Checked","Spares Need to be Replaced","Ready for Sale","Sold","Scrap"];
export const REPAIR_PRIORITIES=["Low","Normal","High","Critical"];
export const REPAIR_STATUSES=["Awaiting Parts","In Repair","Ready for QC","Completed","Cancelled"];
export const REPAIR_PART_STATUSES=["Required","Ordered","Received","Consumed","Returned","Cancelled"];
