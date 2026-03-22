'use client'

import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import api from '../../../lib/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TimetablePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['timetable'],
    queryFn: () => api.get('/api/v1/timetable?per_page=100') as any,
  })

  const slots: any[] = (data as any)?.data?.items || []

  const byDay = DAYS.map((day, idx) => ({
    day,
    slots: slots.filter((s: any) => s.day_of_week === idx).sort((a: any, b: any) => a.start_time?.localeCompare(b.start_time)),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-gray-500 text-sm mt-1">Weekly class schedule</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No timetable slots found</p>
          <p className="text-gray-400 text-sm mt-1">Timetable slots will appear once classes are set up.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byDay.map(({ day, slots }) => (
            <div key={day} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 text-sm">{day}</h2>
              </div>
              {slots.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No classes</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {slots.map((slot: any) => (
                    <div key={slot.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="text-xs text-gray-500 w-28 flex-shrink-0">
                        {slot.start_time} – {slot.end_time}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{slot.subject_id}</p>
                        {slot.room && <p className="text-xs text-gray-500">Room {slot.room}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
