-- Upgrade saved profiles as well as code defaults. Preserve prompts, enabled flags,
-- thresholds, budgets, and historical evaluation/telemetry records.
DO $$
DECLARE
  profile RECORD;
  updated_config JSONB;
  entry RECORD;
  model_id TEXT;
  replacement TEXT;
  model_path TEXT[];
  models_to_upgrade JSONB := '{
    "sonnet": "claude-sonnet-5-5",
    "haiku": "claude-haiku-5-5",
    "opus": "claude-opus-5-5",
    "claude-sonnet-4-5": "claude-sonnet-5-5",
    "claude-sonnet-4-5-20250929": "claude-sonnet-5-5",
    "claude-sonnet-4-6": "claude-sonnet-5-5",
    "claude-haiku-4-5": "claude-haiku-5-5",
    "claude-haiku-4-5-20251001": "claude-haiku-5-5",
    "claude-opus-4-5-20251101": "claude-opus-5-5",
    "anthropic/claude-sonnet-4.5": "anthropic/claude-sonnet-5.5",
    "anthropic/claude-sonnet-4.6": "anthropic/claude-sonnet-5.5",
    "anthropic/claude-haiku-4.5": "anthropic/claude-haiku-5.5",
    "google/gemini-3-flash-preview": "google/gemini-4-argon",
    "google/gemini-2.5-flash": "google/gemini-3.8-flash"
  }'::JSONB;
BEGIN
  FOR profile IN SELECT id, "pluginType", config FROM "PluginProfile"
    WHERE "pluginType" IN ('agentic', 'fallacy-check')
  LOOP
    updated_config := profile.config;
    IF profile."pluginType" = 'agentic' THEN
      model_id := updated_config->>'model';
      IF models_to_upgrade ? model_id THEN
        updated_config := jsonb_set(updated_config, '{model}', models_to_upgrade->model_id);
      END IF;
      FOR entry IN SELECT key, value FROM jsonb_each(COALESCE(updated_config->'subAgents', '{}'::JSONB)) LOOP
        model_id := entry.value->>'model';
        IF models_to_upgrade ? model_id THEN
          updated_config := jsonb_set(updated_config, ARRAY['subAgents', entry.key, 'model'], models_to_upgrade->model_id);
        END IF;
      END LOOP;
      IF NOT updated_config ? 'researchModel' THEN
        updated_config := jsonb_set(updated_config, '{researchModel}', '"openai/gpt-6-luna"');
      END IF;
    ELSE
      FOR entry IN SELECT value, ordinality FROM jsonb_array_elements(COALESCE(updated_config#>'{models,extractors}', '[]'::JSONB)) WITH ORDINALITY LOOP
        model_id := entry.value->>'model';
        IF models_to_upgrade ? model_id THEN
          model_path := ARRAY['models', 'extractors', (entry.ordinality - 1)::TEXT, 'model'];
          updated_config := jsonb_set(updated_config, model_path, models_to_upgrade->model_id);
        END IF;
      END LOOP;
      model_id := updated_config#>>'{models,judge,model}';
      IF models_to_upgrade ? model_id THEN
        updated_config := jsonb_set(updated_config, '{models,judge,model}', models_to_upgrade->model_id);
      END IF;
      FOR entry IN SELECT value, ordinality FROM jsonb_array_elements(COALESCE(updated_config->'filterChain', '[]'::JSONB)) WITH ORDINALITY LOOP
        model_id := entry.value->>'model';
        replacement := models_to_upgrade->>model_id;
        IF model_id = 'google/gemini-3-flash-preview' THEN
          replacement := 'google/gemini-3.8-flash';
        END IF;
        IF replacement IS NOT NULL THEN
          updated_config := jsonb_set(updated_config, ARRAY['filterChain', (entry.ordinality - 1)::TEXT, 'model'], to_jsonb(replacement));
        END IF;
      END LOOP;
    END IF;
    IF updated_config IS DISTINCT FROM profile.config THEN
      UPDATE "PluginProfile" SET config = updated_config, "updatedAt" = CURRENT_TIMESTAMP WHERE id = profile.id;
    END IF;
  END LOOP;
END $$;
