import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Printer } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function numberToWords(num) {
  if (num === 0) return 'Zero'
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
  if (!n) return ''
  let str = ''
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : ''
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : ''
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : ''
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : ''
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : ''
  return str.trim()
}

export default function SalarySlip() {
  const { id, monthYear } = useParams()
  const [monthStr, yearStr] = monthYear.split('-')
  const month = parseInt(monthStr, 10)
  const year = parseInt(yearStr, 10)

  const [e, setEmp] = useState(null)
  const [p, setPayroll] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // 1. Fetch Employee
      const storedEmps = localStorage.getItem('__temp_emps')
      let emp = null
      
      // We need to fetch from API because localstorage hack doesn't have all emp details easily here
      // But we can just use the anon API to fetch employee
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
      
      const { data: eData } = await supabase.from('hrm_employees').select('*, department:department_id(name), designation:designation_id(name)').eq('id', id).single()
      if (eData) setEmp(eData)

      // 2. Fetch Payroll from localStorage
      const storedCur = localStorage.getItem('payroll_' + month + '_' + year)
      const existingRecords = storedCur ? JSON.parse(storedCur) : []
      const pay = existingRecords.find(r => r.employee_id === id)
        
      if (pay) setPayroll(pay)
      setLoading(false)
    }
    load()
  }, [id, month, year])

  if (loading) return <div className="p-8 text-center text-slate-500">Generating Payslip...</div>
  if (!e || !p) return <div className="p-8 text-center text-red-500">Payslip data not found. Please save the payroll first.</div>

  const gross = Number(p.basic_pay) || 0
  const basic = gross * 0.40
  const hra = gross * 0.30
  const conveyance = gross * 0.16
  const medical = gross * 0.04
  const special = gross * 0.04
  const others = gross * 0.06

  const ot = Number(p.ot_amount) || 0
  const inc = Number(p.incentive) || 0
  
  // The old 'petrol' manual input is now absorbed into standard layout, but if they put something extra in manual incentive/petrol we show it in 'others' or standard.
  const extraPetrol = Number(p.petrol_allowance) || 0

  const lop = Number(p.leave_deduction) > 0 ? Number(p.leave_deduction) : 0
  const miscDed = Number(p.leave_deduction) < 0 ? Math.abs(Number(p.leave_deduction)) : 0
  
  const totalEarnings = basic + hra + conveyance + medical + special + others + ot + inc + extraPetrol
  const totalDeductions = lop + miscDed
  const netPay = Math.round(totalEarnings - totalDeductions)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="max-w-4xl mx-auto mb-20">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/payroll/list" className="btn-outline px-3">
          <ChevronLeft size={16} /> Back to Payroll
        </Link>
        <button onClick={handlePrint} className="btn-amber px-6">
          <Printer size={16} /> Print Payslip
        </button>
      </div>

      {/* Payslip Document matching user screenshot layout */}
      <div className="bg-white print:m-0 mx-auto text-black font-sans" style={{ maxWidth: '800px' }}>
        
        {/* Double border container */}
        <div className="border-4 border-black p-[2px]">
          <div className="border border-black">
            
            {/* Header section */}
            <div className="flex items-center p-4 border-b-2 border-black">
              <div className="w-1/4 flex justify-center border-r border-transparent">
                {/* Logo Placeholder - You can replace src with real logo */}
                <div className="w-24 h-24 rounded-full border-2 border-orange-500 flex items-center justify-center text-center p-2 text-xs font-bold text-orange-600 bg-orange-50 shadow-inner">
                  Hertz & Bytes<br/>Logo
                </div>
              </div>
              <div className="w-3/4 text-center px-4">
                <h1 className="text-2xl font-bold text-orange-700 uppercase">Hertz & Bytes Technologies</h1>
                <p className="text-sm mt-1">21/4, 14th Cross, Byrasandra Main Road,</p>
                <p className="text-sm">001, Vijayalaksmi Residency, GM Palya, Bangalore-560 075</p>
                <p className="text-sm font-medium mt-1">T : +91 80 43717374  E : hr@hertzbytes.com</p>
                <p className="text-sm font-medium">W : www.hertzbytes.com  GSTIN/UIN : 29AJGPG7739M1ZJ</p>
              </div>
            </div>

            {/* Title */}
            <div className="text-center py-1 font-bold text-sm border-b-2 border-black bg-gray-50">
              PaySlip for the Month of {MONTHS[month - 1]}, {year}
            </div>

            {/* Employee Info Grid */}
            <div className="grid grid-cols-2 text-sm border-b-2 border-black">
              
              {/* Left Column */}
              <div className="border-r-2 border-black">
                <div className="flex border-b border-black">
                  <div className="w-1/2 p-1 font-bold">Employee Number</div>
                  <div className="w-1/2 p-1 border-l border-black">{e.emp_code}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-1/2 p-1 font-bold">Employee Name</div>
                  <div className="w-1/2 p-1 border-l border-black">{e.name}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-1/2 p-1 font-bold">Branch</div>
                  <div className="w-1/2 p-1 border-l border-black">{e.branch}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-1/2 p-1 font-bold flex items-center">Designation</div>
                  <div className="w-1/2 p-1 border-l border-black leading-tight">
                    {e.designation?.name || 'N/A'}<br/>
                    <span className="text-xs font-normal">{e.department?.name}</span>
                  </div>
                </div>
                <div className="flex">
                  <div className="w-1/2 p-1 font-bold">Department</div>
                  <div className="w-1/2 p-1 border-l border-black">{e.department?.name || 'N/A'}</div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <div className="flex border-b border-black">
                  <div className="w-1/2 p-1 font-bold text-right pr-4">Date of Joining</div>
                  <div className="w-1/2 p-1 border-l border-black text-center">{e.doj ? new Date(e.doj).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'2-digit'}) : ''}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-1/2 p-1 font-bold text-right pr-4">No of Working Days</div>
                  <div className="w-1/2 p-1 border-l border-black text-center">{p.working_days || 0}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-1/2 p-1 font-bold text-right pr-4">No. of Days Present</div>
                  <div className="w-1/2 p-1 border-l border-black text-center">{p.present_days || 0}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-1/2 p-1 font-bold text-right pr-4 flex items-center justify-end">PAN #</div>
                  <div className="w-1/2 p-1 border-l border-black text-center flex items-center justify-center"></div>
                </div>
                <div className="flex">
                  <div className="w-1/2 p-1 font-bold text-right pr-4">SB A/C #</div>
                  <div className="w-1/2 p-1 border-l border-black text-center">{e.bank_account || ''}</div>
                </div>
              </div>
            </div>

            {/* Salary Header */}
            <div className="grid grid-cols-2 text-sm font-bold border-b-2 border-black text-center">
              <div className="border-r-2 border-black flex">
                <div className="w-2/3 p-1">Earnings</div>
                <div className="w-1/3 p-1 border-l border-black">Amount (Rs)</div>
              </div>
              <div className="flex">
                <div className="w-2/3 p-1">Deductions</div>
                <div className="w-1/3 p-1 border-l border-black">Amount (Rs)</div>
              </div>
            </div>

            {/* Salary Body */}
            <div className="grid grid-cols-2 text-sm border-b-2 border-black">
              
              {/* Earnings List */}
              <div className="border-r-2 border-black">
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">Basic Pay</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">{basic.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">HRA</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">{hra.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">Conveyance</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">{conveyance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">Medical Allowance</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">{medical.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">Special Allowance</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">{special.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">Others</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">{others.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                </div>
                {ot > 0 && (
                  <div className="flex border-b border-black">
                    <div className="w-2/3 p-1">Overtime Charges <span className="text-xs">({p.ot_hours})</span></div>
                    <div className="w-1/3 p-1 border-l border-black text-right pr-2">{ot.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>
                )}
                {inc > 0 && (
                  <div className="flex border-b border-black">
                    <div className="w-2/3 p-1">Incentive</div>
                    <div className="w-1/3 p-1 border-l border-black text-right pr-2">{inc.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                  </div>
                )}
                {/* Empty rows to fill height */}
                {Array.from({length: Math.max(0, 3 - (ot > 0 ? 1 : 0) - (inc > 0 ? 1 : 0))}).map((_, i) => (
                  <div key={i} className="flex border-b border-black h-7">
                    <div className="w-2/3 p-1"></div>
                    <div className="w-1/3 p-1 border-l border-black"></div>
                  </div>
                ))}
              </div>

              {/* Deductions List */}
              <div className="flex flex-col">
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">TDS</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">0.00</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">LOP</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">{lop > 0 ? lop.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</div>
                </div>
                <div className="flex border-b border-black">
                  <div className="w-2/3 p-1">Misc Deduction</div>
                  <div className="w-1/3 p-1 border-l border-black text-right pr-2">{miscDed > 0 ? miscDed.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</div>
                </div>
                {/* Empty rows to match Earnings height */}
                {Array.from({length: 6}).map((_, i) => (
                  <div key={i} className="flex border-b border-black h-7 last:border-b-0">
                    <div className="w-2/3 p-1"></div>
                    <div className="w-1/3 p-1 border-l border-black"></div>
                  </div>
                ))}
                <div className="flex-1"></div>
              </div>
            </div>

            {/* Totals Row */}
            <div className="grid grid-cols-2 text-sm font-bold border-b-2 border-black">
              <div className="border-r-2 border-black flex">
                <div className="w-2/3 p-1 pl-2">Total Earnings</div>
                <div className="w-1/3 p-1 border-l border-black text-right pr-2">{totalEarnings.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="flex">
                <div className="w-2/3 p-1 pl-2">Total Deductions</div>
                <div className="w-1/3 p-1 border-l border-black text-right pr-2">{totalDeductions.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
              </div>
            </div>

            {/* Net Pay Final */}
            <div className="grid grid-cols-2 text-sm font-bold">
              <div className="border-r-2 border-black flex items-center justify-center p-4">
                Net Pay: Rs. {netPay.toLocaleString('en-IN', {minimumFractionDigits: 2})}
              </div>
              <div className="p-4 flex flex-col items-center text-center justify-center leading-tight">
                Rupees {numberToWords(netPay)}<br/>Only
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs font-medium pb-10">
          This is a computer generated document and hence no signature is required
        </div>

      </div>
    </div>
  )
}
