import type { AuthorizedRequest } from '../auth/api';
import type { HhConnectionStatus, HhConnectResponse } from '../types';
import type {
  CandidateProfile,
  CreateResumeInput,
  CreateSearchProfileInput,
  Resume,
  SearchProfile,
  UpdateResumeInput,
  UpdateSearchProfileInput,
  UpsertCandidateProfileInput,
} from './types';

export function createDomainApi(request: AuthorizedRequest) {
  return {
    hh: {
      get: () => request<HhConnectionStatus>('/integrations/hh'),
      connect: () =>
        request<HhConnectResponse>('/integrations/hh/connect', {
          method: 'POST',
        }),
      disconnect: () =>
        request<void>('/integrations/hh', {
          method: 'DELETE',
        }),
    },
    profile: {
      get: () => request<CandidateProfile>('/profile'),
      upsert: (input: UpsertCandidateProfileInput) =>
        request<CandidateProfile>('/profile', {
          method: 'PUT',
          body: JSON.stringify(input),
        }),
    },
    searchProfiles: {
      list: () => request<SearchProfile[]>('/search-profiles'),
      create: (input: CreateSearchProfileInput) =>
        request<SearchProfile>('/search-profiles', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      update: (id: string, input: UpdateSearchProfileInput) =>
        request<SearchProfile>(`/search-profiles/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      remove: (id: string) =>
        request<void>(`/search-profiles/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
    },
    resumes: {
      list: () => request<Resume[]>('/resumes'),
      create: (input: CreateResumeInput) =>
        request<Resume>('/resumes', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      update: (id: string, input: UpdateResumeInput) =>
        request<Resume>(`/resumes/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(input),
        }),
      remove: (id: string) =>
        request<void>(`/resumes/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
    },
  };
}
