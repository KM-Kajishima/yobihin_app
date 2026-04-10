"use client"

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
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

const MASTER_COL_WIDTHS_KEY = 'toolMasterColWidths'
const DEFAULT_MASTER_COL_WIDTHS = [120, 160, 100, 160, 80, 160, 150, 150]

export default function Page() {
  const [activeMenu, setActiveMenu] = useState('工具管理一覧')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMasterMenuOpen, setIsMasterMenuOpen] = useState(true)
  
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toolMasters, setToolMasters] = useState<ToolMaster[]>([])
  const [isMasterLoading, setIsMasterLoading] = useState(false)
  const [masterSearch, setMasterSearch] = useState('')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newForm, setNewForm] = useState({ 工具no: '', 名称: '', 略称: '', 詳細: '', 備考: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
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
    async function fetchToolMasters() {
      setIsMasterLoading(true)
      const { data, error } = await supabase.from('工具マスタ').select('*')
      if (error) {
        console.error('工具マスタ取得エラー:', error)
      } else {
        const sorted = ((data as ToolMaster[]) || []).sort((a, b) =>
          a.工具no.localeCompare(b.工具no, 'ja', { numeric: true })
        )
        setToolMasters(sorted)
      }
      setIsMasterLoading(false)
    }
    fetchToolMasters()
  }, [activeMenu])

  const openNewModal = () => {
    setNewForm({ 工具no: '', 名称: '', 略称: '', 詳細: '', 備考: '' })
    setSaveError(null)
    setIsNewModalOpen(true)
  }

  const handleNewSave = async () => {
    if (!newForm.工具no.trim()) {
      setSaveError('工具NOは必須です。')
      return
    }
    setIsSaving(true)
    setSaveError(null)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const { error } = await supabase.from('工具マスタ').insert({
      工具no: newForm.工具no.trim(),
      名称: newForm.名称 || null,
      略称: newForm.略称 || null,
      詳細: newForm.詳細 || null,
      備考: newForm.備考 || null,
      持出回数: 0,
      登録日時: now,
      更新日時: now,
    })
    setIsSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setIsNewModalOpen(false)
    // 一覧を再取得
    setIsMasterLoading(true)
    const { data } = await supabase.from('工具マスタ').select('*')
    const sorted = ((data as ToolMaster[]) || []).sort((a, b) =>
      a.工具no.localeCompare(b.工具no, 'ja', { numeric: true })
    )
    setToolMasters(sorted)
    setIsMasterLoading(false)
  }

  useEffect(() => {
    localStorage.setItem(MASTER_COL_WIDTHS_KEY, JSON.stringify(masterColWidths))
  }, [masterColWidths])

  const handleResizeMouseDown = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault()
    resizingCol.current = { colIndex, startX: e.clientX, startWidth: masterColWidths[colIndex] }
    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return
      const newWidth = Math.max(50, resizingCol.current.startWidth + (ev.clientX - resizingCol.current.startX))
      setMasterColWidths(prev => {
        const next = [...prev]
        next[resizingCol.current!.colIndex] = newWidth
        return next
      })
    }
    const onMouseUp = () => {
      resizingCol.current = null
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

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
                  <button onClick={openNewModal} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                    <Plus className="w-4 h-4" />新規
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors">
                    <Pencil className="w-4 h-4" />修正
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors">
                    <Copy className="w-4 h-4" />複写
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-red-400 text-red-600 hover:bg-red-50 transition-colors">
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
                        .map((row, index) => (
                          <tr key={index} className="hover:bg-blue-50 transition-colors">
                            <td style={{ width: masterColWidths[0] }} className="px-3 py-4 text-sm font-medium text-gray-900 font-mono overflow-hidden whitespace-nowrap text-ellipsis">{row.工具no}</td>
                            <td style={{ width: masterColWidths[1] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.名称 || '-'}</td>
                            <td style={{ width: masterColWidths[2] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.略称 || '-'}</td>
                            <td style={{ width: masterColWidths[3] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.詳細 || '-'}</td>
                            <td style={{ width: masterColWidths[4] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis text-right">{row.持出回数 ?? '-'}</td>
                            <td style={{ width: masterColWidths[5] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.備考 || '-'}</td>
                            <td style={{ width: masterColWidths[6] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.登録日時 || '-'}</td>
                            <td style={{ width: masterColWidths[7] }} className="px-3 py-4 text-sm text-gray-500 overflow-hidden whitespace-nowrap text-ellipsis">{row.更新日時 || '-'}</td>
                          </tr>
                        ))}
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

      {/* 新規登録モーダル */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsNewModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">工具マスタ 新規登録</h2>
              <button onClick={() => setIsNewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{saveError}</p>
              )}
              {([
                { key: '工具no', label: '工具NO', required: true, maxLength: 12 },
                { key: '名称',   label: '名称',   required: false, maxLength: 50 },
                { key: '略称',   label: '略称',   required: false, maxLength: 20 },
                { key: '詳細',   label: '詳細',   required: false, maxLength: 50 },
                { key: '備考',   label: '備考',   required: false, maxLength: 100 },
              ] as const).map(({ key, label, required, maxLength }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}{required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    maxLength={maxLength}
                    value={newForm[key]}
                    onChange={(e) => setNewForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleNewSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? '登録中...' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}