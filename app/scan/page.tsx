"use client"

import React, { useState } from 'react'
import { ArrowRight, ArrowLeft, User, Wrench, CheckCircle, AlertCircle, X, Search } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase' // ← Supabaseを呼び出すためのインポートを追加！

type Mode = '持出' | '返却' | null;

interface Staff {
  社員no: string;
  社員名: string;
}

interface ScannedTool {
  工具no: string;
  名称: string;
  状態: string;
}

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>(null)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [scannedTools, setScannedTools] = useState<ScannedTool[]>([])
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)

  // カメラ実装前のテスト用：QRコードの代わりになる入力欄
  const [staffInput, setStaffInput] = useState('00000001') // テストしやすいよう初期値セット
  const [toolInput, setToolInput] = useState('101000000001')

  // --- 1. 担当者をSupabaseから取得 ---
  const handleStaffScan = async () => {
    if (!staffInput) return;

    // 社員マスタから検索
    const { data, error } = await supabase
      .from('社員マスタ')
      .select('*')
      .eq('社員no', staffInput)
      .single() // 1件だけ取得

    if (error || !data) {
      setMessage({ type: 'error', text: '担当者が見つかりません。QRコードを確認してください。' })
      return
    }

    setStaff({ 社員no: data.社員no, 社員名: data.社員名 })
    setMessage({ type: 'success', text: `${data.社員名}さんを読み込みました` })
    setTimeout(() => setMessage(null), 2000)
  }

  // --- 2. 工具をSupabaseから取得し、状態をチェック ---
  const handleToolScan = async () => {
    if (!toolInput) return;

    if (scannedTools.find(t => t.工具no === toolInput)) {
      setMessage({ type: 'error', text: '既にリストに追加されています' })
      return
    }

    // view_工具一覧から検索（状態を含めて取得するため）
    const { data, error } = await supabase
      .from('view_工具一覧')
      .select('*')
      .eq('工具no', toolInput)
      .single()

    if (error || !data) {
      setMessage({ type: 'error', text: '工具が見つかりません。' })
      return
    }

    // ★ ここが超重要！持出・返却のロジックチェック ★
    if (mode === '持出' && data.状態 === '持出中') {
      setMessage({ type: 'error', text: `【エラー】${data.名称} は既に「持出中」です！` })
      return
    }
    if (mode === '返却' && data.状態 === '保管中') {
      setMessage({ type: 'error', text: `【エラー】${data.名称} は持ち出されていません（保管中）。` })
      return
    }

    // チェックOKならリストに追加
    const newTool: ScannedTool = {
      工具no: data.工具no,
      名称: data.名称,
      状態: data.状態
    }
    setScannedTools([newTool, ...scannedTools])
    setMessage(null)
    setToolInput('') // 次の入力のために空にする
  }

  const handleRemoveTool = (no: string) => {
    setScannedTools(scannedTools.filter(t => t.工具no !== no))
  }

 // --- データベース用の現在日時を作成するツール (YYYY/MM/DD HH:mm:ss) ---
  const getFormattedDate = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // --- 3. 登録ボタンを押した時の処理 ---
  const handleSubmit = async () => {
    if (!mode || !staff || scannedTools.length === 0) return;

    const now = getFormattedDate();

    try {
      if (mode === '持出') {
        // 【持出の場合】新しく実績の行を作成する (INSERT)
        const insertData = scannedTools.map(tool => ({
          工具no: tool.工具no,
          倉庫no: '1', // ※今回は仮で「1」をセット
          持出者: staff.社員名,
          持出日時: now,
          返却者: '',
          返却日時: ''
        }));

        const { error } = await supabase.from('持出返却実績').insert(insertData);
        if (error) throw error;

      } else if (mode === '返却') {
        // 【返却の場合】既存の行を更新する (UPDATE)
        // ※工具1件ずつ、まだ返却されていない行を狙って上書きします
        for (const tool of scannedTools) {
          const { error } = await supabase
            .from('持出返却実績')
            .update({ 返却者: staff.社員名, 返却日時: now })
            .eq('工具no', tool.工具no)
            .eq('返却日時', ''); // 返却日時が空っぽのレコードが対象
          
          if (error) throw error;
        }
      }

      // 成功したら画面をリセットして完了メッセージ
      alert(`${scannedTools.length}件の${mode}処理が完了しました！`);
      setMode(null);
      setStaff(null);
      setScannedTools([]);
      setMessage(null);

    } catch (err) {
      console.error("登録エラー:", err);
      setMessage({ type: 'error', text: `データベースの登録中にエラーが発生しました。` });
    }
  };

  const handleReset = () => {
    if (scannedTools.length > 0 && !confirm('スキャン中のデータが消えますがよろしいですか？')) return;
    setMode(null)
    setStaff(null)
    setScannedTools([])
    setMessage(null)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className={clsx(
        "h-14 flex items-center px-4 text-white shrink-0 shadow-sm transition-colors",
        mode === '持出' ? "bg-blue-600" : mode === '返却' ? "bg-emerald-600" : "bg-slate-800"
      )}>
        {mode && (
          <button onClick={handleReset} className="p-2 -ml-2 mr-2 rounded-full hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-bold flex-1 text-center pr-8">
          {mode ? `工具${mode}スキャン` : '工具管理アプリ'}
        </h1>
      </header>

      {message && (
        <div className={clsx(
          "px-4 py-3 text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2",
          message.type === 'error' ? "bg-red-50 text-red-700 border-b border-red-200" : "bg-green-50 text-green-700 border-b border-green-200"
        )}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <p className="font-medium pt-0.5">{message.text}</p>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        
        {!mode && (
          <div className="flex flex-col gap-4 mt-8">
            <button onClick={() => setMode('持出')} className="flex items-center justify-between p-6 bg-white border-2 border-blue-100 rounded-2xl shadow-sm hover:border-blue-500 hover:bg-blue-50 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors"><ArrowRight className="w-6 h-6" /></div>
                <div className="text-left"><h2 className="text-xl font-bold text-slate-800">持出処理</h2><p className="text-sm text-slate-500 mt-1">倉庫から工具を持ち出す</p></div>
              </div>
            </button>
            <button onClick={() => setMode('返却')} className="flex items-center justify-between p-6 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors"><ArrowLeft className="w-6 h-6" /></div>
                <div className="text-left"><h2 className="text-xl font-bold text-slate-800">返却処理</h2><p className="text-sm text-slate-500 mt-1">倉庫へ工具を戻す</p></div>
              </div>
            </button>
          </div>
        )}

        {mode && !staff && (
          <div className="flex flex-col items-center justify-center h-full gap-4 mt-12">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4"><User className="w-12 h-12" /></div>
            <h2 className="text-lg font-semibold text-slate-700">担当者のQRをスキャン</h2>
            
            {/* テスト用のID手入力エリア */}
            <div className="mt-4 flex gap-2 w-full max-w-xs">
              <input 
                type="text" 
                value={staffInput}
                onChange={(e) => setStaffInput(e.target.value)}
                placeholder="社員NOを入力"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleStaffScan} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2">
                <Search className="w-4 h-4" /> 検索
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">※現在はカメラの代わりにIDを手入力してテストします</p>
          </div>
        )}

        {mode && staff && (
          <div className="flex flex-col h-full pb-24">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><User className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">現在の担当者</p>
                <p className="font-bold text-slate-800">{staff.社員名} <span className="text-xs font-normal text-slate-400 ml-1">({staff.社員no})</span></p>
              </div>
            </div>

            {/* テスト用の工具ID手入力エリア */}
            <div className="flex gap-2 mb-6 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
              <input 
                type="text" 
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                placeholder="工具NOを入力"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleToolScan}
                className={clsx("px-4 py-2 text-white rounded-lg font-semibold flex items-center gap-2 text-sm", mode === '持出' ? "bg-blue-600" : "bg-emerald-600")}
              >
                <Search className="w-4 h-4" /> 追加
              </button>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-700 text-sm">スキャン済 ({scannedTools.length}件)</h3></div>
              {scannedTools.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">まだスキャンされていません</p></div>
              ) : (
                <ul className="space-y-3">
                  {scannedTools.map((tool) => (
                    <li key={tool.工具no} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between animate-in slide-in-from-bottom-2">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{tool.名称}</p>
                        <p className="text-xs text-slate-500 mt-1">NO: {tool.工具no} <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{tool.状態}</span></p>
                      </div>
                      <button onClick={() => handleRemoveTool(tool.工具no)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>

      {mode && staff && scannedTools.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 flex justify-center">
          <div className="w-full max-w-md">
            <button onClick={handleSubmit} className={clsx("w-full py-4 text-white font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2", mode === '持出' ? "bg-blue-600" : "bg-emerald-600")}>
              <CheckCircle className="w-6 h-6" />{scannedTools.length}件を{mode}する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
