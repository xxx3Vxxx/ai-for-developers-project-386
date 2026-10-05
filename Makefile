# Makefile — удобные команды для проекта «Календарь звонков».
# Все цели оборачивают npm-скрипты, описанные в AGENTS.md.

.DEFAULT_GOAL := help

# Node, установленный в userspace, доступен и в неинтерактивных shell.
export PATH := $(HOME)/.local/node/bin:$(PATH)

NPM ?= npm

.PHONY: help install ci-install dev dev-backend dev-frontend build start \
	test test-watch lint lint-fix typecheck format format-check check ci clean

help: ## Показать список команд
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости (npm install)
	$(NPM) install

ci-install: ## Установить зависимости строго по lock-файлу (npm ci)
	$(NPM) ci

dev: ## Запустить бекенд (:3000) и фронтенд (:5173)
	$(NPM) run dev

dev-backend: ## Запустить только бекенд (:3000)
	$(NPM) run dev:backend

dev-frontend: ## Запустить только фронтенд (:5173)
	$(NPM) run dev:frontend

build: ## Собрать бекенд и фронтенд
	$(NPM) run build

start: ## Запустить собранный бекенд (сначала выполните make build)
	$(NPM) run start --workspace backend

test: ## Прогнать тесты
	$(NPM) test

test-watch: ## Тесты в режиме наблюдения (backend)
	$(NPM) run test:watch --workspace backend

lint: ## Проверить код линтером
	$(NPM) run lint

lint-fix: ## Линтер с автоисправлением
	$(NPM) run lint:fix

typecheck: ## Проверить типы
	$(NPM) run typecheck

format: ## Отформатировать код
	$(NPM) run format

format-check: ## Проверить форматирование
	$(NPM) run format:check

check: lint typecheck test ## Линтер + типы + тесты

ci: ## Полный прогон, как в GitHub Actions
	$(NPM) ci
	$(NPM) run lint
	$(NPM) run typecheck
	$(NPM) test
	$(NPM) run build

clean: ## Удалить node_modules и артефакты сборки
	rm -rf node_modules backend/node_modules frontend/node_modules
	rm -rf backend/dist frontend/dist coverage backend/coverage frontend/coverage
