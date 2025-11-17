create type "public"."mood_type" as enum ('happy', 'sad', 'anxious', 'calm', 'stressed', 'neutral');


  create table "public"."ai_insights" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "insight_type" character varying(50) not null,
    "entry_id" uuid,
    "content" jsonb not null,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone
      );


alter table "public"."ai_insights" enable row level security;


  create table "public"."entries" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "content" text not null,
    "mood" public.mood_type,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."entries" enable row level security;


  create table "public"."user_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "reminder_enabled" boolean default true,
    "reminder_time" time without time zone default '20:00:00'::time without time zone,
    "theme" character varying(10) default 'light'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_preferences" enable row level security;

CREATE UNIQUE INDEX ai_insights_pkey ON public.ai_insights USING btree (id);

CREATE UNIQUE INDEX entries_pkey ON public.entries USING btree (id);

CREATE INDEX idx_ai_insights_entry_id ON public.ai_insights USING btree (entry_id);

CREATE INDEX idx_ai_insights_expires_at ON public.ai_insights USING btree (expires_at);

CREATE INDEX idx_ai_insights_type ON public.ai_insights USING btree (insight_type);

CREATE INDEX idx_ai_insights_user_id ON public.ai_insights USING btree (user_id);

CREATE INDEX idx_entries_created_at ON public.entries USING btree (created_at DESC);

CREATE INDEX idx_entries_mood ON public.entries USING btree (mood);

CREATE INDEX idx_entries_search ON public.entries USING gin (to_tsvector('english'::regconfig, content));

CREATE INDEX idx_entries_user_id ON public.entries USING btree (user_id);

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);

CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (id);

CREATE UNIQUE INDEX user_preferences_user_id_key ON public.user_preferences USING btree (user_id);

alter table "public"."ai_insights" add constraint "ai_insights_pkey" PRIMARY KEY using index "ai_insights_pkey";

alter table "public"."entries" add constraint "entries_pkey" PRIMARY KEY using index "entries_pkey";

alter table "public"."user_preferences" add constraint "user_preferences_pkey" PRIMARY KEY using index "user_preferences_pkey";

alter table "public"."ai_insights" add constraint "ai_insights_entry_id_fkey" FOREIGN KEY (entry_id) REFERENCES public.entries(id) ON DELETE CASCADE not valid;

alter table "public"."ai_insights" validate constraint "ai_insights_entry_id_fkey";

alter table "public"."ai_insights" add constraint "ai_insights_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."ai_insights" validate constraint "ai_insights_user_id_fkey";

alter table "public"."entries" add constraint "entries_content_length" CHECK ((char_length(content) <= 50000)) not valid;

alter table "public"."entries" validate constraint "entries_content_length";

alter table "public"."entries" add constraint "entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."entries" validate constraint "entries_user_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_user_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_key" UNIQUE using index "user_preferences_user_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."ai_insights" to "anon";

grant insert on table "public"."ai_insights" to "anon";

grant references on table "public"."ai_insights" to "anon";

grant select on table "public"."ai_insights" to "anon";

grant trigger on table "public"."ai_insights" to "anon";

grant truncate on table "public"."ai_insights" to "anon";

grant update on table "public"."ai_insights" to "anon";

grant delete on table "public"."ai_insights" to "authenticated";

grant insert on table "public"."ai_insights" to "authenticated";

grant references on table "public"."ai_insights" to "authenticated";

grant select on table "public"."ai_insights" to "authenticated";

grant trigger on table "public"."ai_insights" to "authenticated";

grant truncate on table "public"."ai_insights" to "authenticated";

grant update on table "public"."ai_insights" to "authenticated";

grant delete on table "public"."ai_insights" to "service_role";

grant insert on table "public"."ai_insights" to "service_role";

grant references on table "public"."ai_insights" to "service_role";

grant select on table "public"."ai_insights" to "service_role";

grant trigger on table "public"."ai_insights" to "service_role";

grant truncate on table "public"."ai_insights" to "service_role";

grant update on table "public"."ai_insights" to "service_role";

grant delete on table "public"."entries" to "anon";

grant insert on table "public"."entries" to "anon";

grant references on table "public"."entries" to "anon";

grant select on table "public"."entries" to "anon";

grant trigger on table "public"."entries" to "anon";

grant truncate on table "public"."entries" to "anon";

grant update on table "public"."entries" to "anon";

grant delete on table "public"."entries" to "authenticated";

grant insert on table "public"."entries" to "authenticated";

grant references on table "public"."entries" to "authenticated";

grant select on table "public"."entries" to "authenticated";

grant trigger on table "public"."entries" to "authenticated";

grant truncate on table "public"."entries" to "authenticated";

grant update on table "public"."entries" to "authenticated";

grant delete on table "public"."entries" to "service_role";

grant insert on table "public"."entries" to "service_role";

grant references on table "public"."entries" to "service_role";

grant select on table "public"."entries" to "service_role";

grant trigger on table "public"."entries" to "service_role";

grant truncate on table "public"."entries" to "service_role";

grant update on table "public"."entries" to "service_role";

grant delete on table "public"."user_preferences" to "anon";

grant insert on table "public"."user_preferences" to "anon";

grant references on table "public"."user_preferences" to "anon";

grant select on table "public"."user_preferences" to "anon";

grant trigger on table "public"."user_preferences" to "anon";

grant truncate on table "public"."user_preferences" to "anon";

grant update on table "public"."user_preferences" to "anon";

grant delete on table "public"."user_preferences" to "authenticated";

grant insert on table "public"."user_preferences" to "authenticated";

grant references on table "public"."user_preferences" to "authenticated";

grant select on table "public"."user_preferences" to "authenticated";

grant trigger on table "public"."user_preferences" to "authenticated";

grant truncate on table "public"."user_preferences" to "authenticated";

grant update on table "public"."user_preferences" to "authenticated";

grant delete on table "public"."user_preferences" to "service_role";

grant insert on table "public"."user_preferences" to "service_role";

grant references on table "public"."user_preferences" to "service_role";

grant select on table "public"."user_preferences" to "service_role";

grant trigger on table "public"."user_preferences" to "service_role";

grant truncate on table "public"."user_preferences" to "service_role";

grant update on table "public"."user_preferences" to "service_role";


  create policy "Users can view their own insights"
  on "public"."ai_insights"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own entries"
  on "public"."entries"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own entries"
  on "public"."entries"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own entries"
  on "public"."entries"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own entries"
  on "public"."entries"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own preferences"
  on "public"."user_preferences"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own preferences"
  on "public"."user_preferences"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own preferences"
  on "public"."user_preferences"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_entries_updated_at BEFORE UPDATE ON public.entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


