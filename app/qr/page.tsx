"use client"

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase' // パスは環境に合わせて調整してください
import QRCode from 'react-qr-code'
import { Printer } from 'lucide-react'

interface Tool {
  工具no: string;
  名称: string | null;
  略称: string | null;
}

export default function QrBookPage() {
  const [tools, setTools] = useState<Tool[]>([])

  useEffect(() => {
    const fetchTools = async () => {
      const { data } = await supabase
        .from('工具マスタ')
        .select('*')
        .order('工具no', { ascending: true })
      
      if (data) setTools(data)
    }
    fetchTools()
  }, [])

  return (
    <div className="min-h-screen bg-white p-8 font-sans">
      {/* 印刷時には非表示になるヘッダー部分 */}
      <div className="print:hidden flex justify-between items-center mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">工具QRコードブック</h1>
          <p className="text-slate-500 mt-1">シール台紙に印刷して工具に貼り付けてください。</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm"
        >
          <Printer className="w-5 h-5" />
          印刷する
        </button>
      </div>

      {/* QRコードのグリッド表示 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <div key={tool.工具no} className="flex flex-col items-center p-4 border border-dashed border-slate-300 rounded-lg break-inside-avoid">
            <div className="bg-white p-2">
              <QRCode value={tool.工具no} size={120} level="M" />
            </div>
            <div className="mt-3 text-center w-full">
              <p className="text-sm font-bold text-slate-800 truncate">{tool.名称}</p>
              <p className="text-xs text-slate-500 mt-1">{tool.工具no}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}