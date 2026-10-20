/**
 * @file /src/types/automation.ts
 * @description Automation Pipeline Webhook triggers (Make.com, Drive API) and Safe State Serialization types.
 */

export type WebhookTargetType = 'make' | 'google-drive' | 'slack' | 'production-log' | 'custom';

export type WebhookTriggerEvent = 
  | 'on_reel_export' 
  | 'on_shot_created' 
  | 'on_render_complete' 
  | 'on_timeline_sync'
  | 'on_production_approval';

export interface WebhookPipelineConfig {
  id: string;
  name: string;
  url: string;
  targetService: WebhookTargetType;
  triggerEvents: WebhookTriggerEvent[];
  headers?: Record<string, string>;
  authBearerToken?: string;
  enabled: boolean;
  lastTriggeredAt?: string;
  lastStatus?: 'idle' | 'success' | 'failed' | 'pending';
  lastStatusCode?: number;
}

export interface WebhookExecutionLog {
  id: string;
  pipelineId: string;
  pipelineName: string;
  event: WebhookTriggerEvent;
  timestamp: string;
  status: 'pending' | 'success' | 'failed';
  responseCode?: number;
  payloadSummary: string;
  payloadSizeBytes: number;
  durationMs: number;
  errorMessage?: string;
}

export interface SafeStateSnapshotMetadata {
  id: string;
  timestamp: string;
  byteSizeBytes: number;
  isPruned: boolean; // True if binary Blobs/large base64 were pruned to guarantee < 2MB
  shotCount: number;
  projectTitle: string;
}
