import type { components } from "contracts";
import { useCallback, useEffect, useState } from "react";

import { api } from "./client";

export type ServiceConfig = components["schemas"]["ServiceConfig"];

/** Состояние чтения параметров сервиса. */
export type ConfigState =
  { status: "loading" } | { status: "ready"; config: ServiceConfig } | { status: "error" };

/** Читает `GET /api/config` сгенерированным клиентом (ADR-0008). */
async function fetchConfig(): Promise<ServiceConfig> {
  const { data, error } = await api.GET("/api/config");
  if (error) throw error;
  return data;
}

/**
 * Параметры сервиса (зона, рабочее окно, окно записи, сегодня) для экранов.
 * Экраны подставляют их в тексты вместо хардкода; `retry` повторяет чтение.
 */
export function useConfig(): { state: ConfigState; retry: () => void } {
  const [state, setState] = useState<ConfigState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });

    fetchConfig().then(
      (config) => {
        if (active) setState({ status: "ready", config });
      },
      () => {
        if (active) setState({ status: "error" });
      },
    );

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
