"use client"

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { staffSchema, warehouseSchema } from '../lib/volidotion'
import { Wrench, Users, Home, Settings, Search, Menu, ChevronRight, ChevronDown, Database, Plus, Pencil, Copy, Trash2, Upload, Download, X } from 'lucide-react'
import clsx from 'clsx'

// データの形を定義
interface Tool {
  工具no: string;
  状態: string;
  名称: string;
  略称: string;
  詳細: string | null;
  倉庫名: string | null;
  持出者: string | null;
  持出日時: string | null;
  返却者: string | null;
  返却日時: string | null;
}

interface ToolMaster {
  工具no: string;
  名称: string | null;
  略称: string | null;
  詳細: string | null;
  持出回数: number | null;
  備考: string | null;
  登録日時: string | null;
  更新日時: string | null;
}

interface StaffMaster {
  社員no: string;
  社員名: string | null;
  部署: string | null;
  登録日時: string | null;
  更新日時: string | null;
}

interface WarehouseMaster {
  倉庫no: string;
  倉庫名: string | null;
  登録日時: string | null;
  更新日時: string | null;
}

const MASTER_COL_WIDTHS_KEY = 'toolMasterColWidths'
const DEFAULT_MASTER_COL_WIDTHS = [120, 160, 100, 160, 80, 160, 150, 150]
const STAFF_COL_WIDTHS_KEY = 'staffMasterColWidths'
const DEFAULT_STAFF_COL_WIDTHS = [120, 200, 160, 150, 150]
const WAREHOUSE_COL_WIDTHS_KEY = 'warehouseMasterColWidths'
const DEFAULT_WAREHOUSE_COL_WIDTHS = [120, 240, 150, 150]

export default function Page() {
  const [activeMenu, setActiveMenu] = useState('工具管理一覧')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState(true)
  
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // 工具マスタ
  const [toolMasters, setToolMasters] = useState<ToolMaster[]>([])
  const [isMasterLoading, setIsMasterLoading] = useState(false)
  const [masterSearch, setMasterSearch] = useState('')
  const [selectedToolNo, setSelectedToolNo] = useState<string | null>(null)
  const [toolModalMode, setToolModalMode] = useState<'new' | 'edit' | 'copy' | null>(null)
  const [toolModalForm, setToolModalForm] = useState({ 工具no: '', 名称: '', 略称: '', 詳細: '', 備考: '' })
  const [toolSaveError, setToolSaveError] = useState<string | null>(null)
  const [isToolDeleteConfirmOpen, setIsToolDeleteConfirmOpen] = useState(false)
  const [masterColWidths, setMasterColWidths] = useState<number[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_MASTER_COL_WIDTHS
    try {
      const saved = localStorage.getItem(MASTER_COL_WIDTHS_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_MASTER_COL_WIDTHS.length) return parsed as number[]
      }
    } catch {}
    return DEFAULT_MASTER_COL_WIDTHS
  })
  // 担当者マスタ
  const [staffMasters, setStaffMasters] = useState<StaffMaster[]>([])
  const [isStaffLoading, setIsStaffLoading] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')
  const [selectedStaffNo, setSelectedStaffNo] = useState<string | null>(null)
  const [staffModalMode, setStaffModalMode] = useState<'new' | 'edit' | 'copy' | null>(null)
  const [staffModalForm, setStaffModalForm] = useState({ 社員no: '', 社員名: '', 部署: '' })
  const [staffSaveError, setStaffSaveError] = useState<string | null>(null)
  const [isStaffDeleteConfirmOpen, setIsStaffDeleteConfirmOpen] = useState(false)
  const [staffColWidths, setStaffColWidths] = useState<number[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_STAFF_COL_WIDTHS
    try {
      const saved = localStorage.getItem(STAFF_COL_WIDTHS_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_STAFF_COL_WIDTHS.length) return parsed as number[]
      }
    } catch {}
    return DEFAULT_STAFF_COL_WIDTHS
  })
  // 倉庫マスタ
  const [warehouseMasters, setWarehouseMasters] = useState<WarehouseMaster[]>([])
  const [isWarehouseLoading, setIsWarehouseLoading] = useState(false)
  const [warehouseSearch, setWarehouseSearch] = useState('')
  const [selectedWarehouseNo, setSelectedWarehouseNo] = useState<string | null>(null)
  const [warehouseModalMode, setWarehouseModalMode] = useState<'new' | 'edit' | 'copy' | null>(null)
  const [warehouseModalForm, setWarehouseModalForm] = useState({ 倉庫no: '', 倉庫名: '' })
  const [warehouseSaveError, setWarehouseSaveError] = useState<string | null>(null)
  const [isWarehouseDeleteConfirmOpen, setIsWarehouseDeleteConfirmOpen] = useState(false)
  const [warehouseColWidths, setWarehouseColWidths] = useState<number[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_WAREHOUSE_COL_WIDTHS
    try {
      const saved = localStorage.getItem(WAREHOUSE_COL_WIDTHS_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_WAREHOUSE_COL_WIDTHS.length) return parsed as number[]
      }
    } catch {}
    return DEFAULT_WAREHOUSE_COL_WIDTHS
  })
  const [isSaving, setIsSaving] = useState(false)
  const resizingCol = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    async function fetchTools() {
      setIsLoading(true)
      const { data, error } = await supabase.from('view_工具一覧').select('*')
      if (error) {
        console.error('データ取得エラー:', error)
      } else {
        const sorted = ((data as Tool[]) || []).sort((a, b) =>
          a.工具no.localeCompare(b.工具no, 'ja', { numeric: true })
        )
        setTools(sorted)
      }
      setIsLoading(false)
    }
    fetchTools()
  }, [])

  useEffect(() => {
    if (activeMenu !== '工具マスタ') return
    async function fetch() {
      setIsMasterLoading(true)
      const { data, error } = await supabase.from('工具マスタ').select('*')
      if (error) { console.error('工具マスタ取得エラー:', error) }
      else {
        const sorted = ((data as ToolMaster[]) || []).sort((a, b) =>
          a.工具no.localeCompare(b.工具no, 'ja', { numeric: true })
        )
        setToolMasters(sorted)
      }
      setIsMasterLoading(false)
    }
    fetch()
  }, [activeMenu])

  useEffect(() => {
    if (activeMenu !== '担当者マスタ') return
    async function fetch() {
      setIsStaffLoading(true)
      const { data, error } = await supabase.from('社員マスタ').select('*')
      if (error) { console.error('担当者マスタ取得エラー:', error) }
      else {
        const sorted = ((data as StaffMaster[]) || []).sort((a, b) =>
          a.社員no.localeCompare(b.社員no, 'ja', { numeric: true })
        )
        setStaffMasters(sorted)
      }
      setIsStaffLoading(false)
    }
    fetch()
  }, [activeMenu])

  useEffect(() => {
    if (activeMenu !== '倉庫マスタ') return
    async function fetch() {
      setIsWarehouseLoading(true)
      const { data, error } = await supabase.from('倉庫マスタ').select('*')
      if (error) { console.error('倉庫マスタ取得エラー:', error) }
      else {
        const sorted = ((data as WarehouseMaster[]) || []).sort((a, b) =>
          a.倉庫no.localeCompare(b.倉庫no, 'ja', { numeric: true })
        )
        setWarehouseMasters(sorted)
      }
      setIsWarehouseLoading(false)
    }
    fetch()
  }, [activeMenu])

  useEffect(() => { localStorage.setItem(MASTER_COL_WIDTHS_KEY, JSON.stringify(masterColWidths)) }, [masterColWidths])
  useEffect(() => { localStorage.setItem(STAFF_COL_WIDTHS_KEY, JSON.stringify(staffColWidths)) }, [staffColWidths])
  useEffect(() => { localStorage.setItem(WAREHOUSE_COL_WIDTHS_KEY, JSON.stringify(warehouseColWidths)) }, [warehouseColWidths])

  // ---- 工具マスタ CRUD ----
  const refreshToolMasters = async () => {
    setIsMasterLoading(true)
    const { data } = await supabase.from('工具マスタ').select('*')
    const sorted = ((data as ToolMaster[]) || []).sort((a, b) => a.工具no.localeCompare(b.工具no, 'ja', { numeric: true }))
    setToolMasters(sorted)
    setIsMasterLoading(false)
  }
  const openToolModal = (mode: 'new' | 'edit' | 'copy') => {
    if (mode === 'new') {
      setToolModalForm({ 工具no: '', 名称: '', 略称: '', 詳細: '', 備考: '' })
    } else {
      const row = toolMasters.find(r => r.工具no === selectedToolNo)
      if (!row) return
      setToolModalForm({ 工具no: mode === 'copy' ? '' : row.工具no, 名称: row.名称 ?? '', 略称: row.略称 ?? '', 詳細: row.詳細 ?? '', 備考: row.備考 ?? '' })
    }
    setToolSaveError(null)
    setToolModalMode(mode)
  }
  const handleToolSave = async () => {
    if (!toolModalForm.工具no.trim()) { setToolSaveError('工具NOは必須です。'); return }
    setIsSaving(true); setToolSaveError(null)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    let error
    if (toolModalMode === 'edit') {
      ;({ error } = await supabase.from('工具マスタ').update({ 名称: toolModalForm.名称 || null, 略称: toolModalForm.略称 || null, 詳細: toolModalForm.詳細 || null, 備考: toolModalForm.備考 || null, 更新日時: now }).eq('工具no', toolModalForm.工具no))
    } else {
      ;({ error } = await supabase.from('工具マスタ').insert({ 工具no: toolModalForm.工具no.trim(), 名称: toolModalForm.名称 || null, 略称: toolModalForm.略称 || null, 詳細: toolModalForm.詳細 || null, 備考: toolModalForm.備考 || null, 持出回数: 0, 登録日時: now, 更新日時: now }))
    }
    setIsSaving(false)
    if (error) {
      setToolSaveError(error.code === '23505' ? `工具NO「${toolModalForm.工具no.trim()}」は既に登録されています。` : error.message)
      return
    }
    setToolModalMode(null); await refreshToolMasters()
  }
  const handleToolDelete = async () => {
    if (!selectedToolNo) return
    const { error } = await supabase.from('工具マスタ').delete().eq('工具no', selectedToolNo)
    if (error) { alert(error.message); return }
    setSelectedToolNo(null); setIsToolDeleteConfirmOpen(false); await refreshToolMasters()
  }

  // ---- 担当者マスタ CRUD ----
  const refreshStaffMasters = async () => {
    setIsStaffLoading(true)
    const { data } = await supabase.from('社員マスタ').select('*')
    const sorted = ((data as StaffMaster[]) || []).sort((a, b) => a.社員no.localeCompare(b.社員no, 'ja', { numeric: true }))
    setStaffMasters(sorted)
    setIsStaffLoading(false)
  }
  const openStaffModal = (mode: 'new' | 'edit' | 'copy') => {
    if (mode === 'new') {
      setStaffModalForm({ 社員no: '', 社員名: '', 部署: '' })
    } else {
      const row = staffMasters.find(r => r.社員no === selectedStaffNo)
      if (!row) return
      setStaffModalForm({ 社員no: mode === 'copy' ? '' : row.社員no, 社員名: row.社員名 ?? '', 部署: row.部署 ?? '' })
    }
    setStaffSaveError(null)
    setStaffModalMode(mode)
  }
  const handleStaffSave = async () => {
    const result = staffSchema.safeParse({
      社員no: staffModalForm.社員no.trim(),
      社員名: staffModalForm.社員名 || undefined,
      部署: staffModalForm.部署 || undefined,
    })
    if (!result.success) {
      setStaffSaveError(result.error.issues[0].message)
      return
    }
    setIsSaving(true); setStaffSaveError(null)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    let error
    if (staffModalMode === 'edit') {
      ;({ error } = await supabase.from('社員マスタ').update({ 社員名: staffModalForm.社員名 || null, 部署: staffModalForm.部署 || null, 更新日時: now }).eq('社員no', staffModalForm.社員no))
    } else {
      ;({ error } = await supabase.from('社員マスタ').insert({ 社員no: staffModalForm.社員no.trim(), 社員名: staffModalForm.社員名 || null, 部署: staffModalForm.部署 || null, 登録日時: now, 更新日時: now }))
    }
    setIsSaving(false)
    if (error) {
      setStaffSaveError(error.code === '23505' ? `社員NO「${staffModalForm.社員no.trim()}」は既に登録されています。` : error.message)
      return
    }
    setStaffModalMode(null); await refreshStaffMasters()
  }
  const handleStaffDelete = async () => {
    if (!selectedStaffNo) return
    const { error } = await supabase.from('社員マスタ').delete().eq('社員no', selectedStaffNo)
    if (error) { alert(error.message); return }
    setSelectedStaffNo(null); setIsStaffDeleteConfirmOpen(false); await refreshStaffMasters()
  }

  // ---- 倉庫マスタ CRUD ----
  const refreshWarehouseMasters = async () => {
    setIsWarehouseLoading(true)
    const { data } = await supabase.from('倉庫マスタ').select('*')
    const sorted = ((data as WarehouseMaster[]) || []).sort((a, b) => a.倉庫no.localeCompare(b.倉庫no, 'ja', { numeric: true }))
    setWarehouseMasters(sorted)
    setIsWarehouseLoading(false)
  }
  const openWarehouseModal = (mode: 'new' | 'edit' | 'copy') => {
    if (mode === 'new') {
      setWarehouseModalForm({ 倉庫no: '', 倉庫名: '' })
    } else {
      const row = warehouseMasters.find(r => r.倉庫no === selectedWarehouseNo)
      if (!row) return
      setWarehouseModalForm({ 倉庫no: mode === 'copy' ? '' : row.倉庫no, 倉庫名: row.倉庫名 ?? '' })
    }
    setWarehouseSaveError(null)
    setWarehouseModalMode(mode)
  }
  const handleWarehouseSave = async () => {
    const result = warehouseSchema.safeParse({
      倉庫no: warehouseModalForm.倉庫no.trim(),
      倉庫名: warehouseModalForm.倉庫名 || undefined,
    })
    if (!result.success) {
      setWarehouseSaveError(result.error.issues[0].message)
      return
    }
    setIsSaving(true); setWarehouseSaveError(null)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    let error
    if (warehouseModalMode === 'edit') {
      ;({ error } = await supabase.from('倉庫マスタ').update({ 倉庫名: warehouseModalForm.倉庫名 || null, 更新日時: now }).eq('倉庫no', warehouseModalForm.倉庫no))
    } else {
      ;({ error } = await supabase.from('倉庫マスタ').insert({ 倉庫no: warehouseModalForm.倉庫no.trim(), 倉庫名: warehouseModalForm.倉庫名 || null, 登録日時: now, 更新日時: now }))
    }
    setIsSaving(false)
    if (error) {
      setWarehouseSaveError(error.code === '23505' ? `倉庫NO「${warehouseModalForm.倉庫no.trim()}」は既に登録されています。` : error.message)
      return
    }
    setWarehouseModalMode(null); await refreshWarehouseMasters()
  }
  const handleWarehouseDelete = async () => {
    if (!selectedWarehouseNo) return
    const { error } = await supabase.from('倉庫マスタ').delete().eq('倉庫no', selectedWarehouseNo)
    if (error) { alert(error.message); return }
    setSelectedWarehouseNo(null); setIsWarehouseDeleteConfirmOpen(false); await refreshWarehouseMasters()
  }

  // ---- 列幅リサイズ ----
  const makeResizeHandler = (
    getWidth: (i: number) => number,
    setWidths: React.Dispatch<React.SetStateAction<number[]>>
  ) => (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault()
    resizingCol.current = { colIndex, startX: e.clientX, startWidth: getWidth(colIndex) }
    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return
      const { colIndex: ci, startX, startWidth } = resizingCol.current
      const newWidth = Math.max(50, startWidth + (ev.clientX - startX))
      setWidths(prev => { const next = [...prev]; next[ci] = newWidth; return next })
    }
    const onMouseUp = () => {
      resizingCol.current = null
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }
  const handleResizeMouseDown = makeResizeHandler(i => masterColWidths[i], setMasterColWidths)
  const handleStaffResizeMouseDown = makeResizeHandler(i => staffColWidths[i], setStaffColWidths)
  const handleWarehouseResizeMouseDown = makeResizeHandler(i => warehouseColWidths[i], setWarehouseColWidths)

  const menuItems = [
    { name: '工具管理一覧', icon: Wrench },
    {
      name: 'マスタメンテナンス',
      icon: Database,
      subItems: [
        { name: '工具マスタ', icon: Wrench },
        { name: '担当者マスタ', icon: Users },
        { name: '倉庫マスタ', icon: Home },
      ]
    },
    { name: '環境設定', icon: Settings },
  ]

  const handleMasterMenuClick = () => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true)
      setIsMasterMenuOpen(true)
    } else {
      setIsMasterMenuOpen(!isMasterMenuOpen)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className={clsx("bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col shrink-0", isSidebarOpen ? "w-64" : "w-16")}>
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
          {isSidebarOpen ? <span className="text-white font-bold text-lg tracking-wider">工具管理システム</span> : <Wrench className="w-6 h-6 text-blue-500" />}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              if (item.subItems) {
                const isSubActive = item.subItems.some(sub => sub.name === activeMenu);
                return (
                  <li key={item.name} className="pt-2">
                    <button onClick={handleMasterMenuClick} className={clsx("w-full flex items-center px-3 py-3 rounded-md transition-colors", isSubActive && !isMasterMenuOpen ? "text-white" : "hover:bg-slate-800 hover:text-white")}>
                      <item.icon className={clsx("w-5 h-5 shrink-0", isSubActive ? "text-blue-400" : "text-slate-400")} />
                      {isSidebarOpen && (
                        <><span className={clsx("ml-3 text-sm font-medium", isSubActive && "text-white")}>{item.name}</span><div className="ml-auto text-slate-500">{isMasterMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</div></>
                      )}
                    </button>
                    {isMasterMenuOpen && isSidebarOpen && (
                      <ul className="mt-1 space-y-1 pl-11 pr-2 pb-2">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.name}>
                            <button onClick={() => setActiveMenu(subItem.name)} className={clsx("w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-sm", activeMenu === subItem.name ? "bg-blue-600/20 text-blue-400 font-medium" : "text-slate-400 hover:bg-slate-800 hover:text-white")}>
                              {subItem.name}{activeMenu === subItem.name && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              }
              return (
                <li key={item.name}>
                  <button onClick={() => setActiveMenu(item.name)} className={clsx("w-full flex items-center px-3 py-3 rounded-md transition-colors", activeMenu === item.name ? "bg-blue-600 text-white" : "hover:bg-slate-800 hover:text-white")}>
                    <item.icon className={clsx("w-5 h-5 shrink-0", activeMenu === item.name ? "text-white" : "text-slate-400")} />
                    {isSidebarOpen && <span className="ml-3 text-sm font-medium">{item.name}</span>}
                    {isSidebarOpen && activeMenu === item.name && <div className="ml-auto w-2 h-2 rounded-full bg-white" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-gray-100 text-gray-500 focus:outline-none"><Menu className="w-5 h-5" /></button>
            <h1 className="ml-4 text-xl font-semibold text-gray-800">{activeMenu}</h1>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>ログイン: 開発用アカウント</span>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          {activeMenu === '工具管理一覧' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full max-h-200">
              <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative max-w-sm w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                    <input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="工具NOや名称で検索..." />
                  </div>
                  <select className="block w-40 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option>すべての状態</option><option>保管中</option><option>持出中</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">
                    データを読み込み中...
                  </div>
                ) : tools.length === 0 ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">
                    データが見つかりません
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">工具NO</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">状態</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">名称</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">略称</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">詳細</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">倉庫名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">持出者</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">最終持出日時</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">返却者</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">最終返却日時</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tools.map((row, index) => (
                        <tr key={index} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">{row.工具no}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={clsx("px-2 inline-flex text-xs leading-5 font-semibold rounded-full", row.状態 === '保管中' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                              {row.状態 || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.名称 || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.略称 || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.詳細 || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.倉庫名 || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.持出者 || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.持出日時 || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.返却者 || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.返却日時 || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : activeMenu === '工具マスタ' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full max-h-200">
              <div className="p-4 border-b border-gray-200 flex flex-col gap-3 shrink-0">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openToolModal('new')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                    <Plus className="w-4 h-4" />新規
                  </button>
                  <button onClick={() => openToolModal('edit')} disabled={!selectedToolNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Pencil className="w-4 h-4" />修正
                  </button>
                  <button onClick={() => openToolModal('copy')} disabled={!selectedToolNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Copy className="w-4 h-4" />複写
                  </button>
                  <button onClick={() => setIsToolDeleteConfirmOpen(true)} disabled={!selectedToolNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-red-400 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />削除
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors">
                    <Upload className="w-4 h-4" />取込
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors">
                    <Download className="w-4 h-4" />出力
                  </button>
                </div>
                <div className="relative max-w-sm w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                  <input
                    type="text"
                    value={masterSearch}
                    onChange={(e) => setMasterSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="工具NOや名称で検索..."
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {isMasterLoading ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">データを読み込み中...</div>
                ) : toolMasters.length === 0 ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">データが見つかりません</div>
                ) : (
                  <table className="divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: `${masterColWidths.reduce((a, b) => a + b, 0)}px` }}>
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {(['工具NO', '名称', '略称', '詳細', '持出回数', '備考', '登録日時', '更新日時'] as const).map((label, i) => (
                          <th
                            key={label}
                            style={{ width: masterColWidths[i] }}
                            className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden select-none"
                          >
                            <div className="overflow-hidden text-ellipsis whitespace-nowrap pr-2">{label}</div>
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, i)}
                              className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {toolMasters
                        .filter((row) => {
                          if (!masterSearch) return true
                          const q = masterSearch.toLowerCase()
                          return (
                            row.工具no.toLowerCase().includes(q) ||
                            (row.名称 ?? '').toLowerCase().includes(q) ||
                            (row.略称 ?? '').toLowerCase().includes(q)
                          )
                        })
                        .map((row, index) => {
                          const isSel = selectedToolNo === row.工具no
                          return (
                          <tr key={index} onClick={() => setSelectedToolNo(isSel ? null : row.工具no)} className={clsx('cursor-pointer transition-colors', isSel ? 'bg-blue-100' : 'hover:bg-blue-50')}>
                            <td style={{ width: masterColWidths[0] }} className="px-3 py-4 text-sm font-medium text-gray-900 font-mono overflow-hidden whitespace-nowrap text-ellipsis">{row.工具no}</td>
                            <td style={{ width: masterColWidths[1] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.名称 || '-'}</td>
                            <td style={{ width: masterColWidths[2] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.略称 || '-'}</td>
                            <td style={{ width: masterColWidths[3] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.詳細 || '-'}</td>
                            <td style={{ width: masterColWidths[4] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis text-right">{row.持出回数 ?? '-'}</td>
                            <td style={{ width: masterColWidths[5] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.備考 || '-'}</td>
                            <td style={{ width: masterColWidths[6] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.登録日時 || '-'}</td>
                            <td style={{ width: masterColWidths[7] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.更新日時 || '-'}</td>
                          </tr>
                          )
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : activeMenu === '担当者マスタ' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full max-h-200">
              <div className="p-4 border-b border-gray-200 flex flex-col gap-3 shrink-0">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openStaffModal('new')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                    <Plus className="w-4 h-4" />新規
                  </button>
                  <button onClick={() => openStaffModal('edit')} disabled={!selectedStaffNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Pencil className="w-4 h-4" />修正
                  </button>
                  <button onClick={() => openStaffModal('copy')} disabled={!selectedStaffNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Copy className="w-4 h-4" />複写
                  </button>
                  <button onClick={() => setIsStaffDeleteConfirmOpen(true)} disabled={!selectedStaffNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-red-400 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />削除
                  </button>
                </div>
                <div className="relative max-w-sm w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                  <input type="text" value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="社員NOや名称で検索..." />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {isStaffLoading ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">データを読み込み中...</div>
                ) : staffMasters.length === 0 ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">データが見つかりません</div>
                ) : (
                  <table className="divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: `${staffColWidths.reduce((a, b) => a + b, 0)}px` }}>
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {(['社員NO', '社員名', '部署', '登録日時', '更新日時'] as const).map((label, i) => (
                          <th key={label} style={{ width: staffColWidths[i] }} className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden select-none">
                            <div className="overflow-hidden text-ellipsis whitespace-nowrap pr-2">{label}</div>
                            <div onMouseDown={(e) => handleStaffResizeMouseDown(e, i)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400" />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {staffMasters
                        .filter(row => {
                          if (!staffSearch) return true
                          const q = staffSearch.toLowerCase()
                          return row.社員no.toLowerCase().includes(q) || (row.社員名 ?? '').toLowerCase().includes(q) || (row.部署 ?? '').toLowerCase().includes(q)
                        })
                        .map((row, index) => {
                          const isSel = selectedStaffNo === row.社員no
                          return (
                            <tr key={index} onClick={() => setSelectedStaffNo(isSel ? null : row.社員no)} className={clsx('cursor-pointer transition-colors', isSel ? 'bg-blue-100' : 'hover:bg-blue-50')}>
                              <td style={{ width: staffColWidths[0] }} className="px-3 py-4 text-sm font-medium text-gray-900 font-mono overflow-hidden whitespace-nowrap text-ellipsis">{row.社員no}</td>
                              <td style={{ width: staffColWidths[1] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.社員名 || '-'}</td>
                              <td style={{ width: staffColWidths[2] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.部署 || '-'}</td>
                              <td style={{ width: staffColWidths[3] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.登録日時 || '-'}</td>
                              <td style={{ width: staffColWidths[4] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.更新日時 || '-'}</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : activeMenu === '倉庫マスタ' ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full max-h-200">
              <div className="p-4 border-b border-gray-200 flex flex-col gap-3 shrink-0">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openWarehouseModal('new')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                    <Plus className="w-4 h-4" />新規
                  </button>
                  <button onClick={() => openWarehouseModal('edit')} disabled={!selectedWarehouseNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Pencil className="w-4 h-4" />修正
                  </button>
                  <button onClick={() => openWarehouseModal('copy')} disabled={!selectedWarehouseNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Copy className="w-4 h-4" />複写
                  </button>
                  <button onClick={() => setIsWarehouseDeleteConfirmOpen(true)} disabled={!selectedWarehouseNo} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-red-400 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />削除
                  </button>
                </div>
                <div className="relative max-w-sm w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                  <input type="text" value={warehouseSearch} onChange={(e) => setWarehouseSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="倉庫NOや名称で検索..." />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {isWarehouseLoading ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">データを読み込み中...</div>
                ) : warehouseMasters.length === 0 ? (
                  <div className="flex justify-center items-center h-64 text-gray-500">データが見つかりません</div>
                ) : (
                  <table className="divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: `${warehouseColWidths.reduce((a, b) => a + b, 0)}px` }}>
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {(['倉庫NO', '倉庫名', '登録日時', '更新日時'] as const).map((label, i) => (
                          <th key={label} style={{ width: warehouseColWidths[i] }} className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase overflow-hidden select-none">
                            <div className="overflow-hidden text-ellipsis whitespace-nowrap pr-2">{label}</div>
                            <div onMouseDown={(e) => handleWarehouseResizeMouseDown(e, i)} className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400" />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {warehouseMasters
                        .filter(row => {
                          if (!warehouseSearch) return true
                          const q = warehouseSearch.toLowerCase()
                          return row.倉庫no.toLowerCase().includes(q) || (row.倉庫名 ?? '').toLowerCase().includes(q)
                        })
                        .map((row, index) => {
                          const isSel = selectedWarehouseNo === row.倉庫no
                          return (
                            <tr key={index} onClick={() => setSelectedWarehouseNo(isSel ? null : row.倉庫no)} className={clsx('cursor-pointer transition-colors', isSel ? 'bg-blue-100' : 'hover:bg-blue-50')}>
                              <td style={{ width: warehouseColWidths[0] }} className="px-3 py-4 text-sm font-medium text-gray-900 font-mono overflow-hidden whitespace-nowrap text-ellipsis">{row.倉庫no}</td>
                              <td style={{ width: warehouseColWidths[1] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.倉庫名 || '-'}</td>
                              <td style={{ width: warehouseColWidths[2] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.登録日時 || '-'}</td>
                              <td style={{ width: warehouseColWidths[3] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.更新日時 || '-'}</td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <div className="text-center">
                <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{activeMenu}</h3>
                <p className="mt-1 text-sm text-gray-500">この画面は現在準備中です。</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 工具マスタ モーダル */}
      {toolModalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setToolModalMode(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">工具マスタ {toolModalMode === 'new' ? '新規登録' : toolModalMode === 'edit' ? '修正' : '複写'}</h2>
              <button onClick={() => setToolModalMode(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {toolSaveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{toolSaveError}</p>}
              {([
                { key: '工具no', label: '工具NO', required: true, maxLength: 12, halfOnly: true },
                { key: '名称',   label: '名称',   required: false, maxLength: 50,  halfOnly: false },
                { key: '略称',   label: '略称',   required: false, maxLength: 20,  halfOnly: false },
                { key: '詳細',   label: '詳細',   required: false, maxLength: 50,  halfOnly: false },
                { key: '備考',   label: '備考',   required: false, maxLength: 100, halfOnly: false },
              ] as const).map(({ key, label, required, maxLength, halfOnly }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-16 shrink-0 text-sm font-medium text-gray-700 text-right">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input type="text" maxLength={maxLength} value={toolModalForm[key]}
                    onChange={(e) => { const v = halfOnly ? e.target.value.replace(/[^\x20-\x7E\uFF61-\uFF9F]/g, '') : e.target.value; setToolModalForm(p => ({ ...p, [key]: v })) }}
                    readOnly={key === '工具no' && toolModalMode === 'edit'}
                    style={{ width: `calc(${maxLength}ch + 3rem)` }}
                    className={clsx('px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono', key === '工具no' && toolModalMode === 'edit' && 'bg-gray-100 text-gray-500 cursor-not-allowed')} />
                  <span className="text-xs text-gray-400 shrink-0">{maxLength}文字</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setToolModalMode(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleToolSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">{isSaving ? '保存中...' : toolModalMode === 'edit' ? '更新' : '登録'}</button>
            </div>
          </div>
        </div>
      )}
      {isToolDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsToolDeleteConfirmOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-800 mb-2">削除の確認</h2>
              <p className="text-sm text-gray-600">工具NO <span className="font-mono font-medium text-gray-900">{selectedToolNo}</span> を削除します。この操作は元に戻せません。</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setIsToolDeleteConfirmOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleToolDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* 担当者マスタ モーダル */}
      {staffModalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStaffModalMode(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">担当者マスタ {staffModalMode === 'new' ? '新規登録' : staffModalMode === 'edit' ? '修正' : '複写'}</h2>
              <button onClick={() => setStaffModalMode(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {staffSaveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{staffSaveError}</p>}
              {([
                { key: '社員no', label: '社員NO', required: true,  maxLength: 8,  halfOnly: true },
                { key: '社員名', label: '社員名', required: false, maxLength: 30, halfOnly: false },
                { key: '部署',   label: '部署',   required: false, maxLength: 20, halfOnly: false },
              ] as const).map(({ key, label, required, maxLength, halfOnly }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-16 shrink-0 text-sm font-medium text-gray-700 text-right">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input type="text" maxLength={maxLength} value={staffModalForm[key]}
                    onChange={(e) => { const v = halfOnly ? e.target.value.replace(/[^\x20-\x7E\uFF61-\uFF9F]/g, '') : e.target.value; setStaffModalForm(p => ({ ...p, [key]: v })) }}
                    readOnly={key === '社員no' && staffModalMode === 'edit'}
                    style={{ width: `calc(${maxLength}ch + 3rem)` }}
                    className={clsx('px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono', key === '社員no' && staffModalMode === 'edit' && 'bg-gray-100 text-gray-500 cursor-not-allowed')} />
                  <span className="text-xs text-gray-400 shrink-0">{maxLength}文字</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setStaffModalMode(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleStaffSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">{isSaving ? '保存中...' : staffModalMode === 'edit' ? '更新' : '登録'}</button>
            </div>
          </div>
        </div>
      )}
      {isStaffDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsStaffDeleteConfirmOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-800 mb-2">削除の確認</h2>
              <p className="text-sm text-gray-600">社員NO <span className="font-mono font-medium text-gray-900">{selectedStaffNo}</span> を削除します。この操作は元に戻せません。</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setIsStaffDeleteConfirmOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleStaffDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">削除する</button>
            </div>
          </div>
        </div>
      )}

      {/* 倉庫マスタ モーダル */}
      {warehouseModalMode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setWarehouseModalMode(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">倉庫マスタ {warehouseModalMode === 'new' ? '新規登録' : warehouseModalMode === 'edit' ? '修正' : '複写'}</h2>
              <button onClick={() => setWarehouseModalMode(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {warehouseSaveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{warehouseSaveError}</p>}
              {([
                { key: '倉庫no', label: '倉庫NO', required: true,  maxLength: 2,  halfOnly: true },
                { key: '倉庫名', label: '倉庫名', required: false, maxLength: 30, halfOnly: false },
              ] as const).map(({ key, label, required, maxLength, halfOnly }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-16 shrink-0 text-sm font-medium text-gray-700 text-right">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input type="text" maxLength={maxLength} value={warehouseModalForm[key]}
                    onChange={(e) => { const v = halfOnly ? e.target.value.replace(/[^\x20-\x7E\uFF61-\uFF9F]/g, '') : e.target.value; setWarehouseModalForm(p => ({ ...p, [key]: v })) }}
                    readOnly={key === '倉庫no' && warehouseModalMode === 'edit'}
                    style={{ width: `calc(${maxLength}ch + 3rem)` }}
                    className={clsx('px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono', key === '倉庫no' && warehouseModalMode === 'edit' && 'bg-gray-100 text-gray-500 cursor-not-allowed')} />
                  <span className="text-xs text-gray-400 shrink-0">{maxLength}文字</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setWarehouseModalMode(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleWarehouseSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">{isSaving ? '保存中...' : warehouseModalMode === 'edit' ? '更新' : '登録'}</button>
            </div>
          </div>
        </div>
      )}
      {isWarehouseDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsWarehouseDeleteConfirmOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-5">
              <h2 className="text-base font-semibold text-gray-800 mb-2">削除の確認</h2>
              <p className="text-sm text-gray-600">倉庫NO <span className="font-mono font-medium text-gray-900">{selectedWarehouseNo}</span> を削除します。この操作は元に戻せません。</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setIsWarehouseDeleteConfirmOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleWarehouseDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}