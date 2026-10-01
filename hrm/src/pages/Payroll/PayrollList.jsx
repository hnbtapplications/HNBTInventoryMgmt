import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Save, Calculator } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { BRANCHES } from '../../lib/constants'

function formatOT(decimals) {
  if (!decimals) return '00:00:00'
  const h = Math.floor(decimals)
  const m = Math.round((decimals - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function PayrollList() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [branch, setBranch] = useState('')
  const [employees, setEmployees] = useState([])
  const [payrollData, setPayrollData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  async function loadData() {
    setLoading(true)
    try {
      // 1. Fetch Employees
      let q = supabase.from('hrm_employees').select('id, name, emp_code, branch, status').order('emp_code')
      if (branch) q = q.eq('branch', branch)
      const { data: emps, error: empErr } = await q
      if (empErr) console.warn('Error fetching employees:', empErr.message)
      
      // 2. Fetch Existing Payroll for CURRENT month (from localStorage during outage)
      const storedCur = localStorage.getItem('payroll_' + month + '_' + year)
      const existingRecords = storedCur ? JSON.parse(storedCur) : []
        
      // 3. Fetch Payroll for PREVIOUS month (from localStorage during outage)
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const storedPrev = localStorage.getItem('payroll_' + prevMonth + '_' + prevYear)
      const prevRecords = storedPrev ? JSON.parse(storedPrev) : []

      // 4. Fetch Attendance for CURRENT month
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`
      const endStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
      const { data: attendance } = await supabase
        .from('hrm_attendance').select('employee_id, overtime_hours, status').gte('date', startStr).lte('date', endStr)

      // Map existing
      const pMap = {}
      emps?.forEach(e => {
        // Calc Attendance Stats
        let otDecimals = 0
        let clTaken = 0
        
        const empAtt = attendance?.filter(a => a.employee_id === e.id) || []
        empAtt.forEach(a => {
          otDecimals += Number(a.overtime_hours) || 0
          if (a.status === 'Leave') clTaken++
        })

        const existing = existingRecords?.find(r => r.employee_id === e.id)
        
        if (existing) {
          let finalBasic = existing.basic_pay
          if (!finalBasic || finalBasic === 0) {
            const localPay = localStorage.getItem('basic_pay_' + e.id)
            finalBasic = localPay ? Number(localPay) : 0
          }
          
          // Recalc math if we used global instead of 0
          let newOtAmt = existing.ot_amount
          let newNet = existing.net_pay
          if (finalBasic !== existing.basic_pay) {
            const perDay = finalBasic / 30
            const perHour = perDay / 8
            newOtAmt = Math.round(perHour * otDecimals)
            newNet = finalBasic + newOtAmt + Number(existing.incentive||0) + Number(existing.petrol_allowance||0) + Number(existing.leave_deduction||0)
          }

          pMap[e.id] = { 
            ...existing, 
            basic_pay: finalBasic,
            ot_amount: newOtAmt,
            net_pay: newNet,
            _otDecimals: otDecimals, 
            _clTaken: clTaken 
          }
    
        } else {
          // Carry forward basic pay
          const prev = prevRecords?.find(r => r.employee_id === e.id)
          const localPay = localStorage.getItem('basic_pay_' + e.id);
          const basic = prev ? (Number(prev.basic_pay) || 0) : (localPay ? Number(localPay) : 0);
          
          // Math
          const perDay = basic / 30
          const perHour = perDay / 8
          const otAmt = Math.round(perHour * otDecimals)
          
          let adj = 0
          if (clTaken === 0) adj = Math.round(perDay) // Compensate 1 CL
          else if (clTaken > 1) adj = -Math.round((clTaken - 1) * perDay) // Deduct extra
          
          pMap[e.id] = {
            basic_pay: basic,
            ot_amount: otAmt,
            incentive: 0,
            petrol_allowance: 0,
            leave_deduction: adj,
            net_pay: basic + otAmt + adj,
            ot_hours: formatOT ? formatOT(otDecimals) : '00:00:00',
            _otDecimals: otDecimals,
            _clTaken: clTaken
          }
        }
      })
      
      setEmployees(emps || [])
      setPayrollData(pMap)
    } catch (err) {
      console.error("Error in loadData:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [month, year, branch])

  function updateField(empId, field, val) {
    setPayrollData(prev => {
      const row = { ...prev[empId], [field]: val }
      
      let basic = Number(row.basic_pay) || 0
      
      if (field === 'basic_pay') {
        // Auto-recalc OT and Adjustments when Basic Pay is changed!
        const perDay = basic / 30
        const perHour = perDay / 8
        
        const otDecimals = row._otDecimals || 0
        row.ot_amount = Math.round(perHour * otDecimals)
        row.ot_hours = formatOT(otDecimals)
        
        const clTaken = row._clTaken || 0
        if (clTaken === 0) row.leave_deduction = Math.round(perDay)
        else if (clTaken > 1) row.leave_deduction = -Math.round((clTaken - 1) * perDay)
        else row.leave_deduction = 0
      }

      const ot = Number(row.ot_amount) || 0
      const inc = Number(row.incentive) || 0
      const pet = Number(row.petrol_allowance) || 0
      const ded = Number(row.leave_deduction) || 0 
      
      row.net_pay = basic + ot + inc + pet + ded
      
      return { ...prev, [empId]: row }
    })
  }

  async function handleSave() {
    setSaving(true)
    const rows = employees.map(e => {
      const p = payrollData[e.id]
      return {
        employee_id: e.id,
        month,
        year,
        basic_pay: p.basic_pay || 0,
        ot_amount: p.ot_amount || 0,
        ot_hours: p.ot_hours || '00:00:00',
        incentive: p.incentive || 0,
        petrol_allowance: p.petrol_allowance || 0,
        leave_deduction: p.leave_deduction || 0,
        net_pay: p.net_pay || 0,
        status: 'Draft'
      }
    })
    
    // Temporarily disabled due to Supabase API Outage
    // const { error } = await supabase.from('hrm_payroll').upsert(rows, { onConflict: 'employee_id,month,year' })
    // if (error) console.warn(error.message)
    localStorage.setItem('payroll_' + month + '_' + year, JSON.stringify(rows))
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-hb-navy">Payroll Processing</h1>
        <button onClick={handleSave} disabled={saving || employees.length === 0} className="btn-amber">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Payroll Data'}
        </button>
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <select className="select w-32" value={month} onChange={e => setMonth(+e.target.value)}>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="select w-28" value={year} onChange={e => setYear(+e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <select className="select w-40" value={branch} onChange={e => setBranch(e.target.value)}>
          <option value="">All Branches</option>
          {BRANCHES.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Emp Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Basic (₹)</th>
              <th className="px-4 py-3">OT Hrs</th>
              <th className="px-4 py-3">OT Amt</th>
              <th className="px-4 py-3">Incentive</th>
              <th className="px-4 py-3">Petrol</th>
              <th className="px-4 py-3">Adj. (+/-)</th>
              <th className="px-4 py-3 font-bold text-hb-navy">NET PAY</th>
              <th className="px-4 py-3 text-center">Slip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="10" className="text-center py-8">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="10" className="text-center py-8 text-red-500 font-bold">No employees found.</td></tr>
            ) : employees.map(e => {
              const p = payrollData[e.id] || {}
              return (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-500">{e.emp_code}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{e.name}</td>
                  <td className="px-4 py-3">
                    <input type="number" className="input w-24 text-right py-1 px-2" value={p.basic_pay} onChange={ev => updateField(e.id, 'basic_pay', ev.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" className="input w-20 text-center py-1 px-2 font-mono text-xs" readOnly value={p.ot_hours} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" className="input w-20 text-right py-1 px-2 text-amber-700 font-semibold" readOnly value={p.ot_amount} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" className="input w-20 text-right py-1 px-2" value={p.incentive} onChange={ev => updateField(e.id, 'incentive', ev.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" className="input w-20 text-right py-1 px-2" value={p.petrol_allowance} onChange={ev => updateField(e.id, 'petrol_allowance', ev.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" className="input w-20 text-right py-1 px-2" value={p.leave_deduction} onChange={ev => updateField(e.id, 'leave_deduction', ev.target.value)} title="Calculated automatically based on CL taken, but you can override it." />
                  </td>
                  <td className="px-4 py-3 font-bold text-green-700 text-lg">
                    ₹{Number(p.net_pay || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/payroll/slip/${e.id}/${month}/${year}`} className="btn-outline px-3 py-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                      <FileText size={14} /> Slip
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
