"""Offline UI regressions against production components and a fake Axios adapter.

No tenant URL, login, credentials or network access is used. PostgreSQL/domain
integration is covered separately in the backend CI.
"""
import os
import re
import unittest
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'node_modules/.cache/feedback-browser'


class ClientFeedbackBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        options = {'headless': True}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        cls.browser = cls.playwright.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(
            viewport={'width': 1440, 'height': 1000},
            locale='pt-BR', timezone_id='America/Sao_Paulo',
        )
        self.page = self.context.new_page()
        self.page.set_default_timeout(5000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        # Data is served by the Axios test adapter. Fail closed for real requests.
        self.page.route('**/*', lambda route: route.abort())
        self.page.clock.set_fixed_time(datetime(2026, 9, 15, 15, tzinfo=timezone.utc))

    def tearDown(self):
        self.page.screenshot(path=str(OUT / f'{self._testMethodName}.png'), full_page=True)
        self.context.close()
        self.assertEqual(self.errors, [], 'Unexpected JavaScript errors')

    def mount(self, screen='lead', readonly=False, no_loss_stage=False):
        self.page.set_content('<html lang="pt-BR"><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>')
        self.page.evaluate("""flags => {
            Object.assign(window, flags);
            // about:blank has no persistent storage; use an isolated in-memory double.
            for (const key of ['localStorage', 'sessionStorage']) {
                const data = new Map();
                Object.defineProperty(window, key, { value: {
                    getItem: key => data.get(key) ?? null,
                    setItem: (key, value) => data.set(key, String(value)),
                    removeItem: key => data.delete(key), clear: () => data.clear(),
                }});
            }
        }""", {'feedbackScreen': screen, 'feedbackReadOnly': readonly, 'feedbackNoLossStage': no_loss_stage})
        self.page.add_style_tag(path=str(OUT / 'feedback.css'))
        self.page.add_script_tag(path=str(OUT / 'harness.js'))
        if screen == 'lead':
            expect(self.page.get_by_role('button', name='Registrar atendimento', exact=True)).to_be_visible()
            expect(self.page.get_by_text('Carregando acompanhamento...', exact=True)).to_have_count(0)
        else:
            expect(self.page.locator('[data-kanban-stage="Proposta"] [draggable="true"]')).to_have_count(1)

    def test_deadline_save_clear_and_failed_save_preserve_draft(self):
        self.mount()
        field = self.page.get_by_label('Prazo de resposta do cliente', exact=True)
        field.fill('2026-09-25')
        self.page.get_by_role('button', name='Salvar prazo', exact=True).click()
        expect(self.page.get_by_text('Prazo registrado: 25/09/2026.')).to_be_visible()
        self.page.get_by_role('button', name='Remover prazo', exact=True).click()
        expect(field).to_have_value('')
        self.page.evaluate("feedbackTest.failNext = '/leads/lead-test/response-deadline'")
        field.fill('2026-09-26')
        self.page.get_by_role('button', name='Salvar prazo', exact=True).click()
        expect(self.page.get_by_role('alert').filter(has_text='Falha simulada')).to_be_visible()
        expect(field).to_have_value('2026-09-26')
        self.page.get_by_role('button', name='Salvar prazo', exact=True).click()
        expect(self.page.get_by_text('Prazo registrado: 26/09/2026.')).to_be_visible()
        self.assertFalse(self.page.evaluate("feedbackTest.calls.some(c => c.path === '/leads/lead-test' && c.method === 'put')"))

    def test_attendance_records_actual_date_notes_and_next_return(self):
        self.mount()
        self.page.get_by_label('Data e hora do atendimento', exact=False).fill('2026-09-10T10:30')
        self.page.get_by_label('Pr\u00f3ximo follow-up', exact=False).fill('2026-10-01T15:00')
        notes = self.page.get_by_label('Detalhamento do atendimento', exact=False)
        notes.fill('Atendimento de teste com proposta e retorno combinado.')
        self.page.evaluate("feedbackTest.failNext = '/leads/lead-test'")
        self.page.get_by_role('button', name='Registrar atendimento', exact=True).click()
        expect(self.page.get_by_role('alert').filter(has_text='Falha simulada')).to_be_visible()
        expect(notes).to_have_value('Atendimento de teste com proposta e retorno combinado.')
        self.page.get_by_role('button', name='Registrar atendimento', exact=True).click()
        expect(self.page.get_by_text('Atendimento: Atendimento de teste com proposta e retorno combinado.', exact=True)).to_be_visible()
        payload = self.page.evaluate("feedbackTest.calls.find(c => c.path === '/leads/lead-test' && c.method === 'put').payload.contactAttempt")
        self.assertEqual(payload['contactDate'], '2026-09-10T13:30:00.000Z')
        self.assertEqual(payload['followUpDate'], '2026-10-01T18:00:00.000Z')
        self.assertNotIn('userId', payload)
        self.assertNotIn('userName', payload)
        self.page.get_by_role('button', name='Atendimentos', exact=True).click()
        expect(self.page.get_by_text('Ligacao realizada. Atendimento antigo: proposta apresentada e retorno combinado.', exact=True)).to_be_visible()

    def test_scheduled_return_requires_next_date(self):
        self.mount()
        self.page.get_by_label('Resultado', exact=False).select_option('retorno_agendado')
        self.page.get_by_role('button', name='Registrar atendimento', exact=True).click()
        self.assertFalse(self.page.evaluate("feedbackTest.calls.some(c => c.path === '/leads/lead-test' && c.method === 'put')"))
        expect(self.page.get_by_label('Pr\u00f3ximo follow-up', exact=False)).to_have_attribute('required', '')

    def test_direct_loss_validation_retry_mobile_and_history(self):
        self.mount()
        self.page.get_by_role('button', name='Registrar perda', exact=True).click()
        expect(self.page.get_by_role('dialog')).to_be_visible()
        self.page.get_by_role('button', name='Confirmar perda', exact=True).click()
        self.assertFalse(self.page.evaluate("feedbackTest.calls.some(c => c.path.endsWith('/loss') && c.method === 'post')"))
        self.page.get_by_label('Motivo da recusa', exact=False).select_option('price')
        field = self.page.get_by_label('Detalhamento da recusa', exact=False)
        field.fill('Cliente recusou a proposta pelo valor informado.')
        self.page.evaluate("feedbackTest.failNext = '/leads/lead-test/loss'")
        self.page.get_by_role('button', name='Confirmar perda', exact=True).click()
        expect(self.page.get_by_role('dialog').get_by_role('alert')).to_be_visible()
        expect(field).to_have_value('Cliente recusou a proposta pelo valor informado.')
        self.page.set_viewport_size({'width': 390, 'height': 844})
        self.page.screenshot(path=str(OUT / 'loss-mobile.png'), full_page=True)
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        self.page.get_by_role('button', name='Confirmar perda', exact=True).click()
        expect(self.page.get_by_role('dialog')).to_have_count(0)
        expect(self.page.get_by_text('Neg\u00f3cio conclu\u00eddo por perda', exact=False)).to_be_visible()
        expect(self.page.get_by_text('Cliente recusou a proposta pelo valor informado.', exact=True)).to_be_visible()
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))

    def test_readonly_hides_commercial_writes_and_disables_attendance(self):
        self.mount(readonly=True)
        expect(self.page.get_by_role('button', name='Registrar perda', exact=True)).to_have_count(0)
        expect(self.page.get_by_role('button', name='Salvar prazo', exact=True)).to_have_count(0)
        expect(self.page.get_by_role('button', name='Registrar atendimento', exact=True)).to_be_disabled()
        self.assertFalse(self.page.evaluate("feedbackTest.calls.some(c => ['post','put','delete'].includes(c.method))"))

    def test_no_loss_stage_explains_configuration_and_blocks_submit(self):
        self.mount(no_loss_stage=True)
        self.page.get_by_role('button', name='Registrar perda', exact=True).click()
        expect(self.page.get_by_text('Nenhuma etapa de perda est\u00e1 dispon\u00edvel', exact=False)).to_be_visible()
        expect(self.page.get_by_role('button', name='Confirmar perda', exact=True)).to_be_disabled()

    def test_label_filter_keeps_old_lead_and_synchronizes_summary(self):
        self.mount('crm')
        self.page.evaluate('feedbackTest.calls.length = 0')
        label = self.page.get_by_role('combobox', name='Filtrar por etiqueta', exact=True)
        label.select_option('hot')
        expect(label).to_have_value('hot')
        expect(self.page.locator('[data-kanban-stage="Proposta"] [draggable="true"]')).to_have_count(1)
        self.page.wait_for_function("feedbackTest.calls.some(c => c.path === '/leads/summary' && (c.params?.labelId === 'hot' || c.url.includes('labelId=hot')))")
        calls = self.page.evaluate("feedbackTest.calls.filter(c => ['/leads','/leads/summary'].includes(c.path))")
        self.assertTrue(calls)
        for call in calls:
            params = call.get('params') or {}
            self.assertTrue(params.get('labelId') == 'hot' or 'labelId=hot' in call['url'], call)
            self.assertNotIn('dateFrom', call['url'])
            self.assertFalse(params.get('dateFrom'), call)

    def test_temperature_filter_synchronizes_kanban_and_summary(self):
        self.mount('crm')
        self.page.evaluate('feedbackTest.calls.length = 0')
        temperature = self.page.get_by_label('Temperatura do lead', exact=True)
        temperature.select_option('hot')
        expect(temperature).to_have_value('hot')
        expect(self.page.get_by_text('A temperatura é calculada automaticamente', exact=False)).to_be_visible()
        self.page.wait_for_function("feedbackTest.calls.some(c => c.path === '/leads/summary' && c.url.includes('temperature=hot'))")
        self.page.wait_for_function("feedbackTest.calls.some(c => c.path === '/leads' && c.url.includes('temperature=hot'))")
        filtered_calls = self.page.evaluate("feedbackTest.calls.filter(c => ['/leads','/leads/summary'].includes(c.path) && c.url.includes('temperature=hot'))")
        self.assertTrue(any(call['path'] == '/leads' for call in filtered_calls))
        self.assertTrue(any(call['path'] == '/leads/summary' for call in filtered_calls))
        for call in filtered_calls:
            self.assertNotIn('dateFrom', call['url'])

    def test_temperature_filter_refreshes_after_stage_mutation(self):
        self.mount('crm')
        temperature = self.page.get_by_label('Temperatura do lead', exact=True)
        temperature.select_option('warm')
        self.page.wait_for_function("feedbackTest.calls.some(c => c.path === '/leads' && c.url.includes('temperature=warm'))")
        source = self.page.locator('[data-kanban-stage="Proposta"] [draggable="true"]')
        target = self.page.locator('[data-kanban-stage="Follow-up"]')
        transfer = self.page.evaluate_handle('new DataTransfer()')
        source.dispatch_event('dragstart', {'dataTransfer': transfer})
        target.dispatch_event('dragover', {'dataTransfer': transfer})
        target.dispatch_event('drop', {'dataTransfer': transfer})
        expect(self.page.get_by_role('dialog')).to_be_visible()
        self.page.locator('textarea[placeholder="Descreva o motivo desta movimentação..."]').fill('Avanço validado com o cliente.')
        self.page.evaluate('feedbackTest.calls.length = 0')
        self.page.get_by_role('button', name='Confirmar e mover', exact=True).click()
        expect(self.page.get_by_role('dialog')).to_have_count(0)
        self.page.wait_for_function("feedbackTest.calls.some(c => c.path === '/leads/lead-test' && c.method === 'put' && c.payload?.stage === 'Follow-up')")
        self.page.wait_for_function("feedbackTest.calls.some(c => c.path === '/leads' && c.url.includes('temperature=warm'))")
        self.page.wait_for_function("feedbackTest.calls.some(c => c.path === '/leads/summary' && c.url.includes('temperature=warm'))")
        expect(self.page.locator('[data-kanban-stage="Proposta"] [draggable="true"]')).to_have_count(0)
        expect(self.page.locator('[data-kanban-stage="Follow-up"] [draggable="true"]')).to_have_count(1)

    def test_kanban_direct_loss_opens_reason_without_intermediate_transition(self):
        self.mount('crm')
        source = self.page.locator('[data-kanban-stage="Proposta"] [draggable="true"]')
        target = self.page.locator('[data-kanban-stage="N\u00e3o aceito"]')
        transfer = self.page.evaluate_handle('new DataTransfer()')
        source.dispatch_event('dragstart', {'dataTransfer': transfer})
        target.dispatch_event('dragover', {'dataTransfer': transfer})
        expect(target.get_by_text('Solte aqui', exact=False)).to_be_visible()
        target.dispatch_event('drop', {'dataTransfer': transfer})
        expect(self.page.get_by_role('dialog')).to_be_visible()
        self.assertFalse(self.page.evaluate("feedbackTest.calls.some(c => c.method === 'put')"))
        self.page.get_by_label('Motivo da recusa', exact=False).select_option('proposal')
        self.page.get_by_label('Detalhamento da recusa', exact=False).fill('Cliente recusou o escopo da proposta apresentada.')
        self.page.get_by_role('button', name='Confirmar perda', exact=True).click()
        expect(self.page.get_by_role('dialog')).to_have_count(0)
        expect(target.locator('[draggable="true"]')).to_have_count(1)
        expect(self.page.locator('[data-kanban-stage="Proposta"] [draggable="true"]')).to_have_count(0)
        mutations = self.page.evaluate("feedbackTest.calls.filter(c => ['put','post'].includes(c.method))")
        self.assertEqual(len(mutations), 1)
        self.assertEqual(mutations[0]['path'], '/leads/lead-test/loss')
        self.assertEqual(mutations[0]['payload']['targetStageId'], 'loss')


if __name__ == '__main__':
    unittest.main(verbosity=2)
