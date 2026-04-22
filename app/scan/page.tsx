"use client"

import React, { useState } from 'react'
import { ArrowRight, ArrowLeft, Camera, User, Wrench, CheckCircle, AlertCircle, X, Search, Info } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { Scanner } from '@yudiel/react-qr-scanner'

type Mode = '持出' | '返却' | null;

interface Staff {
  社員no: string;
  社員名: string;
}

interface ScannedTool {
  工具no: string;
  名称: string;
  状態: string;
  isError?: boolean;
  errorMessage?: string;
}

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>(null)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [scannedTools, setScannedTools] = useState<ScannedTool[]>([])
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info', text: string } | null>(null)

  const [activeScanner, setActiveScanner] = useState<'staff' | 'tool' | null>(null)
  const [staffInput, setStaffInput] = useState('')
  const [toolInput, setToolInput] = useState('')

  const playScanBeep = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  const getFormattedDate = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const handleStaffScan = async (idToSearch: string) => {
    if (!idToSearch) return;

    const { data, error } = await supabase
      .from('社員マスタ')
      .select('*')
      .eq('社員no', idToSearch)
      .single()

    if (error || !data) {
      setMessage({ type: 'error', text: '担当者が見つかりません。QRコードを確認してください。' })
      return
    }

    setStaff({ 社員no: data.社員no, 社員名: data.社員名 })
    setMessage({ type: 'success', text: `${data.社員名}さんを読み込みました` })
    setTimeout(() => setMessage(null), 2000)
    setStaffInput('')
  }

  const handleToolScan = async (idToSearch: string) => {
    if (!idToSearch) return;

    if (scannedTools.find(t => t.工具no === idToSearch)) {
      setToolInput('');
      return; 
    }

    let isError = false;
    let errorMessage = "";
    let toolName = "不明な工具";
    let toolState = "不明";

    const { data: toolData, error: toolError } = await supabase
      .from('工具マスタ')
      .select('*')
      .eq('工具no', idToSearch)
      .single()

    if (toolError || !toolData) {
      isError = true;
      errorMessage = "マスタに登録されていません";
    } else {
      toolName = toolData.名称;
      
      const { data: jissekiData } = await supabase
        .from('持出返却実績')
        .select('*')
        .eq('工具no', idToSearch)
        .single()

      const isCheckedOut = !!(jissekiData && jissekiData.持出日時 && !jissekiData.返却日時)
      toolState = isCheckedOut ? '持出中' : '保管中'

      if (mode === '持出' && isCheckedOut) {
        isError = true;
        errorMessage = "既に持出中（他の人が利用中）です";
      } else if (mode === '返却' && !isCheckedOut) {
        isError = true;
        errorMessage = "保管中のため返却できません";
      }
    }

    const newTool: ScannedTool = {
      工具no: idToSearch,
      名称: toolName,
      状態: toolState,
      isError,
      errorMessage
    }

    setScannedTools(prev => [newTool, ...prev])
    setMessage(null)
    setToolInput('')
  }

  const handleRemoveTool = (no: string) => {
    setScannedTools(scannedTools.filter(t => t.工具no !== no))
  }

  const handleSubmit = async () => {
    if (!mode || !staff || scannedTools.length === 0) return;

    const validTools = scannedTools.filter(tool => !tool.isError);

    if (validTools.length === 0) {
      setMessage({ type: 'error', text: '登録可能な正常データがありません。' });
      return;
    }

    const now = getFormattedDate();

    try {
      if (mode === '持出') {
        const upsertData = validTools.map(tool => ({
          工具no: tool.工具no,
          持出者: staff.社員名,
          持出日時: now,
          返却者: '',
          返却日時: ''
        }));

        const { error } = await supabase
          .from('持出返却実績')
          .upsert(upsertData, { onConflict: '工具no' });
        if (error) throw error;

      } else if (mode === '返却') {
        for (const tool of validTools) {
          const { error } = await supabase
            .from('持出返却実績')
            .update({ 返却者: staff.社員名, 返却日時: now })
            .eq('工具no', tool.工具no);
          
          if (error) throw error;
        }
      }

      const errorCount = scannedTools.length - validTools.length;
      let alertMsg = `${validTools.length}件の${mode}処理が完了しました！`;
      if (errorCount > 0) {
        alertMsg += `\n(※エラーの${errorCount}件は除外されました)`;
      }
      
      alert(alertMsg);
      
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

  const validCount = scannedTools.filter(t => !t.isError).length;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans relative">
      
      {activeScanner && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex justify-between items-center p-4 bg-slate-900 text-white pb-6 relative z-20">
            <h2 className="font-bold">{activeScanner === 'staff' ? '担当者のQR' : '工具のQR'}をスキャン</h2>
            <button onClick={() => setActiveScanner(null)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
            <Scanner
              onScan={(result) => {
                if (result && result.length > 0) {
                  const scannedCode = result[0].rawValue;
                  
                  if (activeScanner === 'tool' && scannedTools.find(t => t.工具no === scannedCode)) {
                    return; 
                  }

                  playScanBeep();
                  
                  if (activeScanner === 'staff') {
                    setActiveScanner(null);
                    handleStaffScan(scannedCode);
                  } else {
                    handleToolScan(scannedCode);
                  }
                }
              }}
              onError={(error) => console.log(error)}
            />
            
            <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none z-10">
              <div className="w-full h-full border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
            </div>

            {/* ★ 修正: top-4に変更し、whitespace-nowrapを追加して改行を防ぐ */}
            {activeScanner === 'tool' && scannedTools.length > 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-blue-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center justify-center gap-2 border border-blue-400 animate-in fade-in slide-in-from-top-2 whitespace-nowrap min-w-max">
                <CheckCircle className="w-6 h-6 shrink-0" />
                <span className="text-xl">{scannedTools.length}</span> 件スキャン済
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-900 text-center text-slate-100 text-sm flex flex-col gap-4 relative z-20 border-t border-slate-800">
            <p className="opacity-80">枠内にQRコードを合わせてください</p>
            {activeScanner === 'tool' && (
              <button 
                onClick={() => setActiveScanner(null)} 
                className="py-4 px-6 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95 transition-all text-base flex justify-center items-center gap-2"
              >
                スキャンを終了してリストを見る
              </button>
            )}
          </div>
        </div>
      )}

      <header className={clsx("h-14 flex items-center px-4 text-white shrink-0 shadow-sm transition-colors", mode === '持出' ? "bg-blue-600" : mode === '返却' ? "bg-emerald-600" : "bg-slate-800")}>
        {mode && <button onClick={handleReset} className="p-2 -ml-2 mr-2 rounded-full hover:bg-white/20"><ArrowLeft className="w-5 h-5" /></button>}
        <h1 className="text-lg font-bold flex-1 text-center pr-8">{mode ? `工具${mode}スキャン` : '工具管理アプリ'}</h1>
      </header>

      {message && (
        <div className={clsx("px-4 py-3 text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2", 
          message.type === 'error' ? "bg-red-50 text-red-700 border-b border-red-200" : 
          message.type === 'info' ? "bg-blue-50 text-blue-700 border-b border-blue-200" : "bg-green-50 text-green-700 border-b border-green-200"
        )}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : 
           message.type === 'info' ? <Info className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <p className="font-medium pt-0.5">{message.text}</p>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {!mode && (
          <div className="flex flex-col gap-4 mt-8">
            <button onClick={() => setMode('持出')} className="flex items-center justify-between p-6 bg-white border-2 border-blue-100 rounded-2xl shadow-sm hover:border-blue-500 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><ArrowRight className="w-6 h-6" /></div>
                <div className="text-left"><h2 className="text-xl font-bold text-slate-800">持出処理</h2><p className="text-sm text-slate-500 mt-1">倉庫から工具を持ち出す</p></div>
              </div>
            </button>
            <button onClick={() => setMode('返却')} className="flex items-center justify-between p-6 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm hover:border-emerald-500 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><ArrowLeft className="w-6 h-6" /></div>
                <div className="text-left"><h2 className="text-xl font-bold text-slate-800">返却処理</h2><p className="text-sm text-slate-500 mt-1">倉庫へ工具を戻す</p></div>
              </div>
            </button>
          </div>
        )}

        {mode && !staff && (
          <div className="flex flex-col items-center justify-center h-full gap-4 mt-12">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4"><User className="w-12 h-12" /></div>
            
            <button onClick={() => setActiveScanner('staff')} className="px-8 py-4 bg-slate-800 text-white font-bold rounded-full shadow-lg flex items-center gap-3 hover:bg-slate-700 active:scale-95 transition-all text-lg mb-8">
              <Camera className="w-6 h-6" />
              担当者のQRをスキャン
            </button>

            <div className="w-full border-t border-slate-200 relative mt-4">
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-gray-50 px-2 text-xs text-slate-400">または手入力</span>
            </div>

            <div className="mt-4 flex gap-2 w-full max-w-xs">
              <input type="text" value={staffInput} onChange={(e) => setStaffInput(e.target.value)} placeholder="社員NOを入力" className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => handleStaffScan(staffInput)} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center gap-2"><Search className="w-4 h-4" /> 検索</button>
            </div>
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

            <button onClick={() => setActiveScanner('tool')} className={clsx("mb-6 py-4 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-lg", mode === '持出' ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700")}>
              <Camera className="w-6 h-6" />
              工具のQRをスキャンして追加
            </button>

            <div className="flex gap-2 mb-6 shrink-0 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
              <input type="text" value={toolInput} onChange={(e) => setToolInput(e.target.value)} placeholder="手動で工具NOを入力" className="flex-1 px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white" />
              <button onClick={() => handleToolScan(toolInput)} className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold flex items-center gap-2 text-sm"><Search className="w-4 h-4" /> 追加</button>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-slate-700 text-sm">スキャン済 ({scannedTools.length}件)</h3></div>
              
              {scannedTools.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl"><Wrench className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">まだスキャンされていません</p></div>
              ) : (
                <ul className="space-y-3">
                  {scannedTools.map((tool) => (
                    <li key={tool.工具no} className={clsx(
                      "p-4 rounded-xl shadow-sm border flex items-center justify-between animate-in slide-in-from-bottom-2",
                      tool.isError ? "bg-red-50 border-red-300" : "bg-white border-slate-200"
                    )}>
                      <div>
                        <p className={clsx("font-bold text-sm", tool.isError ? "text-red-800" : "text-slate-800")}>{tool.名称}</p>
                        <p className={clsx("text-xs mt-1", tool.isError ? "text-red-500" : "text-slate-500")}>
                          NO: {tool.工具no} 
                          {!tool.isError && <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{tool.状態}</span>}
                        </p>
                        {tool.isError && (
                          <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {tool.errorMessage}
                          </p>
                        )}
                      </div>
                      <button onClick={() => handleRemoveTool(tool.工具no)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
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
            <button 
              onClick={handleSubmit} 
              disabled={validCount === 0}
              className={clsx(
                "w-full py-4 text-white font-bold text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2", 
                validCount === 0 ? "bg-slate-300 cursor-not-allowed" :
                mode === '持出' ? "bg-blue-600 hover:bg-blue-700 active:scale-95" : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
              )}
            >
              <CheckCircle className="w-6 h-6" />
              {validCount === 0 ? '登録できるデータがありません' : `${validCount}件を${mode}する`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}