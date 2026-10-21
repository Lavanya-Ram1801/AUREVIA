import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post } from './api';
import type { Category, CourseCardData, CourseDetail, EnrollmentItem, Notification, Paged } from '../types';

export interface CourseFilters { q?: string; category?: string; level?: string; price?: string; sort?: string; page?: number; pageSize?: number }

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => get<Category[]>('/categories'), staleTime: 10 * 60_000 });

export const useCourses = (f: CourseFilters) =>
  useQuery({ queryKey: ['courses', f], queryFn: () => get<Paged<CourseCardData>>('/courses', { ...f }), placeholderData: (prev) => prev });

export const useCourse = (idOrSlug: string | undefined) =>
  useQuery({ queryKey: ['course', idOrSlug], queryFn: () => get<CourseDetail>(`/courses/${idOrSlug}`), enabled: Boolean(idOrSlug), retry: false });

export const useMyEnrollments = (enabled = true) =>
  useQuery({ queryKey: ['enrollments'], queryFn: () => get<EnrollmentItem[]>('/enrollments/me'), enabled });

export const useNotifications = (enabled: boolean) =>
  useQuery({ queryKey: ['notifications'], queryFn: () => get<{ items: Notification[]; unread: number }>('/notifications'), enabled, refetchInterval: 60_000 });

export function useWishlistToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, wished }: { id: string; wished: boolean }) => (wished ? del(`/courses/${id}/wishlist`) : post(`/courses/${id}/wishlist`)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wishlist'] });
      void qc.invalidateQueries({ queryKey: ['course'] });
    },
  });
}
