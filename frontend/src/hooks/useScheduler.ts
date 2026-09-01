import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchEvents, createEvent, deleteEvent, fetchStudyPlan, saveStudyPlan, fetchNotifications, markNotificationRead, deleteNotification, deleteAllNotifications, fetchPlanLogs, savePlanLogs, deleteCourseData, generateAIStudyPlan, } from '../services/scheduler.service'

// ---- Events ---------------------------------------------------------------

export const useEvents = () =>
  useQuery({ queryKey: ['events'], queryFn: fetchEvents, staleTime: 2 * 60 * 1000 })

export const useCreateEvent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event added!') },
    onError: () => toast.error('Failed to add event'),
  })
}

export const useDeleteEvent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event deleted') },
    onError: () => toast.error('Failed to delete event'),
  })
}

// ---- Study Plan -----------------------------------------------------------

export const useStudyPlan = () =>
  useQuery({ queryKey: ['study-plan'], queryFn: fetchStudyPlan, staleTime: 5 * 60 * 1000 })

export const useSaveStudyPlan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: saveStudyPlan,
    // setQueryData instead of invalidateQueries: the server echoes back the
    // full updated plan — we put it straight into the cache so no refetch
    // fires and local state is not wiped mid-render.
    onSuccess: (updatedPlan) => qc.setQueryData(['study-plan'], updatedPlan),
    onError: () => toast.error('Failed to save study plan'),
  })
}

// ---- Notifications --------------------------------------------------------

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
  })

export const useMarkNotificationRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export const useDeleteNotification = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export const useDeleteAllNotifications = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All notifications cleared') },
    onError: () => toast.error('Failed to clear notifications'),
  })
}

// ---- Study Plan Logs ------------------------------------------------------

export const usePlanLogs = () =>
  useQuery({ queryKey: ['plan-logs'], queryFn: fetchPlanLogs, staleTime: 5 * 60 * 1000 })

export const useSavePlanLogs = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: savePlanLogs,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan-logs'] }); toast.success('Progress saved!') },
    onError: () => toast.error('Failed to save progress'),
  })
}

export const useDeleteCourseData = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCourseData,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['study-plan'] })
      qc.invalidateQueries({ queryKey: ['plan-logs'] })
      toast.success('Course deleted')
    },
    onError: () => toast.error('Failed to delete course'),
  })
}

// ---- AI Schedule Generation -----------------------------------------------

export const useGenerateAISchedule = () => {
  return useMutation({
    mutationFn: generateAIStudyPlan,
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'AI generation failed. Please try again.'
      toast.error(msg)
    },
  })
}

// ---- Google Calendar -------------------------------------------------------

import { fetchGCalStatus, fetchGCalAuthUrl, syncGoogleCalendar, disconnectGoogleCalendar } from '../services/scheduler.service'

export const useGCalStatus = () =>
    useQuery({
        queryKey: ['gcal-status'],
        queryFn:  fetchGCalStatus,
        staleTime: 60_000,
    })

export const useConnectGCal = () => {
    return useMutation({
        mutationFn: fetchGCalAuthUrl,
        onSuccess: ({ url }) => {
            // Full page redirect to Google consent screen
            window.location.href = url
        },
        onError: () => toast.error('Failed to start Google Calendar connection'),
    })
}

export const useSyncGCal = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: syncGoogleCalendar,
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['events'] })
            toast.success(data.message)
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message ?? 'Sync failed'
            toast.error(msg)
        },
    })
}

export const useDisconnectGCal = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: disconnectGoogleCalendar,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['gcal-status'] })
            toast.success('Google Calendar disconnected')
        },
        onError: () => toast.error('Failed to disconnect'),
    })
}