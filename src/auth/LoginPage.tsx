import { LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, QRCode, Space, Steps, Typography } from 'antd'
import { useState } from 'react'
import type { Step } from '../api/types'
import { useT } from '../i18n'
import { useAuth } from './AuthContext'
import { loginErrorText } from './loginLogic'

type Stage =
  | { kind: 'password' }
  | { kind: 'code'; ticket: string }
  | { kind: 'setup'; ticket: string; secret?: string; uri?: string }

export default function LoginPage() {
  const auth = useAuth()
  const { t, lang, setLang } = useT()
  const [caps, setCaps] = useState(false)
  const [stage, setStage] = useState<Stage>({ kind: 'password' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(loginErrorText(e, { bad: t('login.bad'), tooMany: t('login.tooMany'), offline: t('login.offline') }))
    } finally {
      setBusy(false)
    }
  }

  const onPassword = (v: { email: string; password: string }) =>
    run(async () => {
      const result = await auth.login(v.email, v.password)
      if (result.done) return
      const step: Step = result.step
      if (step.status === 'totp_required') {
        setStage({ kind: 'code', ticket: step.ticket })
      } else {
        const setup = await auth.startTotpSetup(step.ticket)
        setStage({ kind: 'setup', ticket: step.ticket, secret: setup.secret, uri: setup.otpauth_uri })
      }
    })

  return (
    <div className="login-page">
      <Card className="login-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="login-head">
            <span className="brand-mark" aria-hidden>S</span>
            <div style={{ flex: 1 }}>
              <Typography.Title level={3} style={{ margin: 0 }}>{t('login.title')}</Typography.Title>
              <Typography.Text type="secondary">{t('login.sub')}</Typography.Text>
            </div>
            <Button type="text" size="small" onClick={() => setLang(lang === 'en' ? 'si' : 'en')}>
              {lang === 'en' ? 'සිංහල' : 'English'}
            </Button>
          </div>

          {error && <Alert type="error" showIcon role="alert" message={error} />}

          {stage.kind === 'password' && (
            <Form layout="vertical" onFinish={onPassword} requiredMark={false}>
              <Form.Item name="email" label={t('login.email')} rules={[{ required: true, type: 'email' }]}>
                <Input prefix={<MailOutlined />} autoComplete="username" autoFocus inputMode="email" />
              </Form.Item>
              <Form.Item name="password" label={t('login.password')} rules={[{ required: true }]}
                extra={caps ? <Typography.Text type="warning" role="status">{t('login.caps')}</Typography.Text> : undefined}>
                <Input.Password prefix={<LockOutlined />} autoComplete="current-password"
                  onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))} onBlur={() => setCaps(false)} />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={busy}>
                {t('login.continue')}
              </Button>
              <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
                {t('login.forgot')}
              </Typography.Paragraph>
            </Form>
          )}

          {stage.kind === 'code' && (
            <CodeForm
              busy={busy}
              label={t('login.code')}
              onSubmit={(code) => run(() => auth.verifyTotp(stage.ticket, code))}
              onBack={() => setStage({ kind: 'password' })}
            />
          )}

          {stage.kind === 'setup' && (
            <>
              <Steps
                size="small"
                current={1}
                items={[{ title: t('login.step.password') }, { title: t('login.step.setup') }, { title: t('login.step.done') }]}
              />
              <Typography.Paragraph>{t('login.setup')}</Typography.Paragraph>
              {stage.uri && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <QRCode value={stage.uri} size={180} />
                </div>
              )}
              <Typography.Text type="secondary">
                {t('login.cantScan')} <Typography.Text code copyable>{stage.secret}</Typography.Text>
              </Typography.Text>
              <CodeForm
                busy={busy}
                label={t('login.codeShort')}
                onSubmit={(code) => run(() => auth.enableTotp(stage.ticket, code))}
                onBack={() => setStage({ kind: 'password' })}
              />
            </>
          )}
        </Space>
      </Card>
    </div>
  )
}

function CodeForm(props: {
  busy: boolean
  label: string
  onSubmit: (code: string) => void
  onBack: () => void
}) {
  const { t } = useT()
  return (
    <Form layout="vertical" onFinish={(v: { code: string }) => props.onSubmit(v.code)} requiredMark={false}>
      <Form.Item
        name="code"
        label={props.label}
        rules={[{ required: true, pattern: /^\d{6}$/, message: t('login.sixDigits') }]}
      >
        <Input
          prefix={<SafetyOutlined />}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
        />
      </Form.Item>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Button onClick={props.onBack}>{t('login.back')}</Button>
        <Button type="primary" htmlType="submit" loading={props.busy}>
          {t('login.verify')}
        </Button>
      </Space>
    </Form>
  )
}
