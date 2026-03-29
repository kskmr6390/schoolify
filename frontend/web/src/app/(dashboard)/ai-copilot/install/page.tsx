'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle, ArrowLeft, Check, ChevronRight, Cpu,
  Download, Folder, Loader2, RefreshCw, Terminal, Wifi, WifiOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import api from '../../../../lib/api'
import { LOCAL_ARCHITECTURES } from '../../../../store/aiStore'
import { cn } from '../../../../lib/utils'

type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface Step {
  id: string
  title: string
  desc: string
  status: StepStatus
  message?: string
}

const STEPS = ['check', 'install', 'folder', 'model', 'pull', 'verify'] as const
type StepId = typeof STEPS[number]

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === 'done')    return <Check size={15} className="text-emerald-600" />
  if (status === 'running') return <Loader2 size={15} className="text-indigo-600 animate-spin" />
  if (status === 'error')   return <AlertCircle size={15} className="text-red-500" />
  return <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 inline-block" />
}

function stepBg(status: StepStatus) {
  if (status === 'done')    return 'bg-emerald-50 border-emerald-200'
  if (status === 'running') return 'bg-indigo-50 border-indigo-200'
  if (status === 'error')   return 'bg-red-50 border-red-200'
  return 'bg-white border-gray-200'
}

function generateScript(installPath: string, arch: string, os: 'mac' | 'linux' | 'windows'): string {
  const ollamaModel = {
    'tinyllama-1.1b': 'tinyllama',
    'phi-2':          'phi',
    'phi-3-mini':     'phi3',
    'llama-3.2-3b':   'llama3.2:3b',
    'mistral-7b':     'mistral',
  }[arch] ?? arch

  if (os === 'windows') {
    return `# Schoolify AI Copilot Setup (Windows PowerShell)
# Run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\\setup-ai-copilot.ps1

$InstallPath = "${installPath.replace(/\\/g, '\\\\')}"
$ModelName   = "${ollamaModel}"

Write-Host "Creating ai-copilot folder..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "$InstallPath\\ai-copilot" | Out-Null
Set-Location "$InstallPath\\ai-copilot"

# Check if Ollama is installed
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Host "Downloading Ollama for Windows..." -ForegroundColor Yellow
  Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile "OllamaSetup.exe"
  Start-Process -FilePath ".\\OllamaSetup.exe" -Wait
  Remove-Item ".\\OllamaSetup.exe"
} else {
  Write-Host "Ollama already installed." -ForegroundColor Green
}

Write-Host "Starting Ollama service..." -ForegroundColor Cyan
Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 3

Write-Host "Pulling model: $ModelName ..." -ForegroundColor Cyan
ollama pull $ModelName

Write-Host "Done! Model $ModelName is ready." -ForegroundColor Green
Write-Host "Ollama is running at http://localhost:11434" -ForegroundColor Green
`
  }

  const installCmd = os === 'mac'
    ? 'brew install ollama 2>/dev/null || curl -fsSL https://ollama.com/install.sh | sh'
    : 'curl -fsSL https://ollama.com/install.sh | sh'

  return `#!/bin/bash
# Schoolify AI Copilot Setup (${os === 'mac' ? 'macOS' : 'Linux'})
# Run: bash setup-ai-copilot.sh

set -e

INSTALL_PATH="${installPath}"
MODEL_NAME="${ollamaModel}"
AI_DIR="$INSTALL_PATH/ai-copilot"

echo "Creating ai-copilot folder at $AI_DIR ..."
mkdir -p "$AI_DIR"
cd "$AI_DIR"

# Install Ollama if not present
if ! command -v ollama &>/dev/null; then
  echo "Installing Ollama..."
  ${installCmd}
else
  echo "Ollama already installed: $(ollama --version)"
fi

# Start Ollama in background if not running
if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Starting Ollama service..."
  nohup ollama serve > ollama.log 2>&1 &
  sleep 3
fi

echo "Pulling model: $MODEL_NAME ..."
ollama pull "$MODEL_NAME"

echo ""
echo "✅ Done! $MODEL_NAME is ready."
echo "   Ollama running at: http://localhost:11434"
echo "   Log file: $AI_DIR/ollama.log"
`
}

export default function InstallLocalLLMPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [activeStep, setActiveStep] = useState<StepId>('check')
  const [stepStatuses, setStepStatuses] = useState<Record<StepId, StepStatus>>({
    check: 'pending', install: 'pending', folder: 'pending',
    model: 'pending', pull: 'pending', verify: 'pending',
  })
  const [stepMessages, setStepMessages] = useState<Record<StepId, string>>({
    check: '', install: '', folder: '', model: '', pull: '', verify: '',
  })
  const [selectedArch, setSelectedArch] = useState('phi-3-mini')
  const [installPath, setInstallPath] = useState(() =>
    typeof window !== 'undefined'
      ? (navigator.platform.includes('Win') ? 'C:\\Users\\user' : '~')
      : '~'
  )
  const [detectedOS, setDetectedOS] = useState<'mac' | 'linux' | 'windows'>('linux')

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('mac')) setDetectedOS('mac')
    else if (ua.includes('win')) setDetectedOS('windows')
    else setDetectedOS('linux')
  }, [])

  const setStep = (id: StepId, status: StepStatus, message = '') => {
    setStepStatuses(prev => ({ ...prev, [id]: status }))
    setStepMessages(prev => ({ ...prev, [id]: message }))
  }

  // ── System check ──────────────────────────────────────────────────────────
  const { data: sysData, refetch: recheckSystem, isFetching: sysChecking } = useQuery({
    queryKey: ['system-check'],
    queryFn: () => api.get('/api/v1/copilot/system/check') as any,
    enabled: false,
  })
  const sys = (sysData as any)?.data

  const runSystemCheck = async () => {
    setActiveStep('check')
    setStep('check', 'running', 'Checking server hardware…')
    try {
      await recheckSystem()
      setStep('check', 'done', 'System check complete')
      setActiveStep('install')
      setStep('install', 'pending')
    } catch (e: any) {
      setStep('check', 'error', e.message || 'System check failed')
    }
  }

  // ── Model pull via backend ────────────────────────────────────────────────
  const pullMutation = useMutation({
    mutationFn: () =>
      api.post('/api/v1/copilot/system/pull-model', { arch: selectedArch }) as any,
    onSuccess: () => {
      setStep('pull', 'done', `${selectedArch} pull started in background`)
      setActiveStep('verify')
      setStep('verify', 'running', 'Waiting for model to be ready…')
      pollModelReady()
    },
    onError: (e: any) => setStep('pull', 'error', e.message || 'Pull failed'),
  })

  // ── Poll model status ─────────────────────────────────────────────────────
  const { data: modelStatusData, refetch: recheckModel } = useQuery({
    queryKey: ['model-status', selectedArch],
    queryFn: () => api.get(`/api/v1/copilot/model/status?arch=${selectedArch}`) as any,
    enabled: false,
  })

  const pollModelReady = async () => {
    let attempts = 0
    const maxAttempts = 60 // up to ~5 minutes
    const poll = async () => {
      attempts++
      try {
        const res = await recheckModel() as any
        const ready = res.data?.data?.status === 'ready'
        if (ready) {
          setStep('verify', 'done', 'Model is ready!')
          queryClient.invalidateQueries({ queryKey: ['copilot-conversations'] })
          return
        }
      } catch { /* continue */ }
      if (attempts < maxAttempts) {
        setStep('verify', 'running', `Checking model status… (${attempts}/${maxAttempts})`)
        setTimeout(poll, 5000)
      } else {
        setStep('verify', 'error', 'Timed out — model may still be downloading. Check back in a few minutes.')
      }
    }
    setTimeout(poll, 5000)
  }

  const downloadScript = () => {
    const ext = detectedOS === 'windows' ? '.ps1' : '.sh'
    const content = generateScript(installPath, selectedArch, detectedOS)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `setup-ai-copilot${ext}`
    a.click()
    URL.revokeObjectURL(url)
    setStep('install', 'done', `Script downloaded (setup-ai-copilot${ext})`)
    setActiveStep('folder')
    setStep('folder', 'pending')
  }

  const allDone = stepStatuses.verify === 'done'

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/ai-copilot')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Cpu size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Install Local LLM</h1>
            <p className="text-xs text-gray-500">Run AI on your own server — no API key needed</p>
          </div>
        </div>
      </div>

      {allDone && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
          <Check size={18} className="flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Local LLM is ready!</p>
            <p className="text-xs mt-0.5">Your AI Copilot is now powered by <strong>{selectedArch}</strong> running locally.</p>
          </div>
          <button
            onClick={() => router.push('/ai-copilot')}
            className="ml-auto px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
          >
            Start Chatting
          </button>
        </div>
      )}

      <div className="space-y-3">

        {/* ── Step 1: System Check ─────────────────────────────────────────── */}
        <div className={cn('rounded-xl border p-4 transition-all', stepBg(stepStatuses.check))}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <StatusIcon status={stepStatuses.check} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">Step 1 — System Check</p>
                <p className="text-xs text-gray-500 mt-0.5">Detect server RAM, disk, CPU to find compatible models</p>

                {sys && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs">
                      <span className="text-gray-400">RAM</span>
                      <span className="ml-auto float-right font-semibold text-gray-700">{sys.ram_gb} GB</span>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs">
                      <span className="text-gray-400">Free Disk</span>
                      <span className="ml-auto float-right font-semibold text-gray-700">{sys.disk_free_gb} GB</span>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs">
                      <span className="text-gray-400">CPU Cores</span>
                      <span className="ml-auto float-right font-semibold text-gray-700">{sys.cpu_cores}</span>
                    </div>
                    <div className="bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs">
                      <span className="text-gray-400">OS</span>
                      <span className="ml-auto float-right font-semibold text-gray-700">{sys.os}</span>
                    </div>
                  </div>
                )}

                {sys?.ollama_reachable && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <Wifi size={12} />
                    Ollama already running at {sys.ollama_url}
                    {sys.ollama_version && <span className="text-gray-400">v{sys.ollama_version}</span>}
                  </div>
                )}

                {sys && !sys.ollama_reachable && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                    <WifiOff size={12} />
                    Ollama not running yet — complete the install steps below
                  </div>
                )}

                {stepMessages.check && (
                  <p className={cn('text-xs mt-2', stepStatuses.check === 'error' ? 'text-red-600' : 'text-gray-500')}>
                    {stepMessages.check}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={runSystemCheck}
              disabled={sysChecking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
            >
              {sysChecking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {sys ? 'Re-check' : 'Check System'}
            </button>
          </div>
        </div>

        {/* ── Step 2: Download Script ──────────────────────────────────────── */}
        <div className={cn('rounded-xl border p-4 transition-all', stepBg(stepStatuses.install))}>
          <div className="flex items-start gap-3">
            <StatusIcon status={stepStatuses.install} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Step 2 — Download Setup Script</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Generates a script for your OS that installs Ollama and sets up the ai-copilot folder
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Install path:</span>
                <div className="relative flex-1 max-w-xs">
                  <Folder size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={installPath}
                    onChange={e => setInstallPath(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                    placeholder="~/ai-copilot"
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">OS:</span>
                {(['mac', 'linux', 'windows'] as const).map(os => (
                  <button key={os}
                    onClick={() => setDetectedOS(os)}
                    className={cn('px-2.5 py-1 rounded-full text-xs border transition-colors', detectedOS === os
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}>
                    {os === 'mac' ? 'macOS' : os === 'linux' ? 'Linux' : 'Windows'}
                  </button>
                ))}
              </div>

              {stepMessages.install && (
                <p className="text-xs mt-2 text-emerald-600">{stepMessages.install}</p>
              )}
            </div>
            <button
              onClick={downloadScript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 flex-shrink-0"
            >
              <Download size={12} />
              Download Script
            </button>
          </div>
        </div>

        {/* ── Step 3: Run Script ───────────────────────────────────────────── */}
        <div className={cn('rounded-xl border p-4 transition-all', stepBg(stepStatuses.folder))}>
          <div className="flex items-start gap-3">
            <StatusIcon status={stepStatuses.folder} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Step 3 — Run the Script Locally</p>
              <p className="text-xs text-gray-500 mt-0.5">Open a terminal on your server and run the downloaded script</p>

              <div className="mt-3 bg-gray-900 rounded-xl px-4 py-3 font-mono text-xs text-green-400 space-y-1">
                {detectedOS === 'windows' ? (
                  <>
                    <p><span className="text-gray-500"># PowerShell (Admin)</span></p>
                    <p>Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass</p>
                    <p>.\\setup-ai-copilot.ps1</p>
                  </>
                ) : (
                  <>
                    <p><span className="text-gray-500"># Terminal</span></p>
                    <p>chmod +x setup-ai-copilot.sh</p>
                    <p>./setup-ai-copilot.sh</p>
                  </>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                The script will: create <code className="bg-gray-100 px-1 rounded">ai-copilot/</code> folder → install Ollama → start the service
              </p>
            </div>
            <button
              onClick={() => { setStep('folder', 'done', 'Script run confirmed'); setActiveStep('model'); setStep('model', 'pending') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 flex-shrink-0"
            >
              <Check size={12} />
              Mark Done
            </button>
          </div>
        </div>

        {/* ── Step 4: Select Model ─────────────────────────────────────────── */}
        <div className={cn('rounded-xl border p-4 transition-all', stepBg(stepStatuses.model))}>
          <div className="flex items-start gap-3">
            <StatusIcon status={stepStatuses.model} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Step 4 — Select Model</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose based on your server RAM
                {sys?.compatible_models?.length > 0 && ` — compatible: ${sys.compatible_models.join(', ')}`}
              </p>

              <div className="mt-3 grid gap-2">
                {LOCAL_ARCHITECTURES.map(arch => {
                  const isCompatible = !sys || sys.compatible_models?.includes(arch.id)
                  return (
                    <button
                      key={arch.id}
                      onClick={() => { setSelectedArch(arch.id); setStep('model', 'done', `Selected: ${arch.name}`); setActiveStep('pull'); setStep('pull', 'pending') }}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all',
                        selectedArch === arch.id && stepStatuses.model === 'done'
                          ? 'border-indigo-300 bg-indigo-50'
                          : isCompatible
                          ? 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/50'
                          : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      )}
                      disabled={!isCompatible}
                    >
                      <div className="flex items-center gap-2.5">
                        <Cpu size={14} className={isCompatible ? 'text-indigo-500' : 'text-gray-400'} />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{arch.name}</p>
                          <p className="text-[11px] text-gray-400">{arch.size} · {arch.ram} RAM · {arch.speed}</p>
                        </div>
                      </div>
                      {!isCompatible && (
                        <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Insufficient RAM</span>
                      )}
                      {selectedArch === arch.id && stepStatuses.model === 'done' && (
                        <Check size={14} className="text-indigo-600" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Step 5: Pull Model via Backend ───────────────────────────────── */}
        <div className={cn('rounded-xl border p-4 transition-all', stepBg(stepStatuses.pull))}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <StatusIcon status={stepStatuses.pull} />
              <div>
                <p className="text-sm font-semibold text-gray-800">Step 5 — Pull Model</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pulls <strong>{selectedArch}</strong> into Ollama on the server. May take several minutes.
                </p>
                {stepMessages.pull && (
                  <p className={cn('text-xs mt-2', stepStatuses.pull === 'error' ? 'text-red-600' : 'text-emerald-600')}>
                    {stepMessages.pull}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setStep('pull', 'running', `Pulling ${selectedArch}…`); pullMutation.mutate() }}
              disabled={pullMutation.isPending || stepStatuses.model !== 'done'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
            >
              {pullMutation.isPending
                ? <Loader2 size={12} className="animate-spin" />
                : <Terminal size={12} />}
              Pull Model
            </button>
          </div>
        </div>

        {/* ── Step 6: Verify ───────────────────────────────────────────────── */}
        <div className={cn('rounded-xl border p-4 transition-all', stepBg(stepStatuses.verify))}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <StatusIcon status={stepStatuses.verify} />
              <div>
                <p className="text-sm font-semibold text-gray-800">Step 6 — Verify</p>
                <p className="text-xs text-gray-500 mt-0.5">Confirm model is loaded and ready to answer queries</p>
                {stepMessages.verify && (
                  <p className={cn('text-xs mt-2', stepStatuses.verify === 'error' ? 'text-red-600' : stepStatuses.verify === 'done' ? 'text-emerald-600' : 'text-indigo-600')}>
                    {stepMessages.verify}
                  </p>
                )}
              </div>
            </div>
            {stepStatuses.verify === 'done' && (
              <button
                onClick={() => router.push('/ai-copilot')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
              >
                Open Copilot <ChevronRight size={12} />
              </button>
            )}
            {stepStatuses.verify === 'error' && (
              <button
                onClick={() => { setStep('verify', 'running', 'Rechecking…'); pollModelReady() }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50"
              >
                <RefreshCw size={12} /> Retry
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
