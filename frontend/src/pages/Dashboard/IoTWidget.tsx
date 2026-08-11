import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Satellite, Thermometer, Clock, ArrowRight, Radio } from 'lucide-react'

// Illustrative live-feed telemetry — the IoT ingestion pipeline (forklift
// GPS/engine/hour-meter sensors) is not wired to this dashboard yet, so
// these rows are a fixed mock feed demonstrating the intended widget.
const MOCK_TELEMETRY = [
  { unit: 'Forklift 01', gps: 'Active', engineTemp: 'Normal', hours: '124h' },
  { unit: 'Forklift 02', gps: 'Active', engineTemp: 'Normal', hours: '89h' },
  { unit: 'Forklift 03', gps: 'Active', engineTemp: 'Normal', hours: '312h' },
  { unit: 'Forklift 04', gps: 'Active', engineTemp: 'Normal', hours: '45h' },
]

function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  )
}

export default function IoTWidget() {
  const { t } = useTranslation()

  return (
    <section className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Radio size={18} className="text-blue-700" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('dashboard.iot.title')}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            <PulsingDot />
            {t('dashboard.iot.live')}
          </span>
        </div>
        <Link
          to="/iot-management"
          className="group flex items-center gap-1 text-xs font-semibold text-blue-700 transition-colors hover:text-blue-900"
        >
          {t('dashboard.iot.viewAll')}
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MOCK_TELEMETRY.map((unit) => (
          <Link
            key={unit.unit}
            to="/iot-management"
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 transition-colors duration-200 hover:border-blue-600 hover:bg-blue-50/40"
          >
            <div className="flex items-center gap-2">
              <PulsingDot />
              <span className="text-sm font-semibold text-slate-800">{unit.unit}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Satellite size={12} className="text-cyan-600" /> {t('dashboard.iot.gps')}: <span className="font-medium text-slate-700">{unit.gps}</span>
              </span>
              <span className="flex items-center gap-1">
                <Thermometer size={12} className="text-amber-600" /> {t('dashboard.iot.engineTemp')}: <span className="font-medium text-slate-700">{unit.engineTemp}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-violet-600" /> {t('dashboard.iot.hours')}: <span className="font-medium text-slate-700">{unit.hours}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
