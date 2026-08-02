-- Faz 1: Çağrı merkezi, PBX, AI Call, PayTR webhook logları (haber/HM ile ilişkisiz).

SELECT portal_superapp_archive_and_clear('phase1_comms', 'ai_call_logs');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'ai_call_contacts');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'ai_call_campaigns');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'ai_call_assistants');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'ai_call_flows');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'ai_call_settings');

SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_pending_transfers');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_verimor_events');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_campaign_contacts');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_call_logs');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_agent_queues');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_queue_members');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_agents');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_campaigns');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_ai_campaign_config');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_ivr_flows');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_verimor_campaigns');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_extensions');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_queues');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_trunks');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'pbx_settings');

SELECT portal_superapp_archive_and_clear('phase1_comms', 'call_center_subscription_requests');
SELECT portal_superapp_archive_and_clear('phase1_comms', 'paytr_webhook_events');

SELECT portal_superapp_drop_if_exists('ai_call_logs');
SELECT portal_superapp_drop_if_exists('ai_call_contacts');
SELECT portal_superapp_drop_if_exists('ai_call_campaigns');
SELECT portal_superapp_drop_if_exists('ai_call_assistants');
SELECT portal_superapp_drop_if_exists('ai_call_flows');
SELECT portal_superapp_drop_if_exists('ai_call_settings');

SELECT portal_superapp_drop_if_exists('pbx_pending_transfers');
SELECT portal_superapp_drop_if_exists('pbx_verimor_events');
SELECT portal_superapp_drop_if_exists('pbx_campaign_contacts');
SELECT portal_superapp_drop_if_exists('pbx_call_logs');
SELECT portal_superapp_drop_if_exists('pbx_agent_queues');
SELECT portal_superapp_drop_if_exists('pbx_queue_members');
SELECT portal_superapp_drop_if_exists('pbx_agents');
SELECT portal_superapp_drop_if_exists('pbx_campaigns');
SELECT portal_superapp_drop_if_exists('pbx_ai_campaign_config');
SELECT portal_superapp_drop_if_exists('pbx_ivr_flows');
SELECT portal_superapp_drop_if_exists('pbx_verimor_campaigns');
SELECT portal_superapp_drop_if_exists('pbx_extensions');
SELECT portal_superapp_drop_if_exists('pbx_queues');
SELECT portal_superapp_drop_if_exists('pbx_trunks');
SELECT portal_superapp_drop_if_exists('pbx_settings');

SELECT portal_superapp_drop_if_exists('call_center_subscription_requests');
SELECT portal_superapp_drop_if_exists('paytr_webhook_events');

ALTER TABLE site_settings
  ALTER COLUMN call_center_enabled SET DEFAULT false;

UPDATE site_settings
SET
  call_center_enabled = false,
  call_center_subscription_status = 'none',
  call_center_subscription_plan = NULL,
  call_center_subscription_expires_at = NULL
WHERE id IS NOT NULL;
