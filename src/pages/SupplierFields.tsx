import { Button, Form, Input, InputNumber, Select, Space, Switch, Typography } from 'antd'
import { useT } from '../i18n'

/** Empty text means "not set": the server wants null, not "". */
export function clean<T extends Record<string, unknown>>(values: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = typeof v === 'string' ? v.trim() || null : v
  }
  return out as T
}

/** The business fields Finance needs: the same form for a new supplier and for an edit. */
export function DetailFields({ withName }: { withName: boolean }) {
  const { t } = useT()
  return (
    <>
      {withName && (
        <Form.Item name="name" label={t('sd.f.name')} rules={[{ required: true, min: 2 }]}>
          <Input autoFocus />
        </Form.Item>
      )}
      <Form.Item name="contact_name" label={t('sd.contact')}><Input /></Form.Item>
      <Form.Item name="phone" label={t('sd.phone')}><Input inputMode="tel" /></Form.Item>
      <Form.Item name="email" label={t('sd.email')} rules={[{ type: 'email' }]}><Input /></Form.Item>
      <Form.Item name="address" label={t('sd.address')}><Input.TextArea rows={2} /></Form.Item>
      <Form.Item name="credit_days" label={t('sd.f.credit')} initialValue={0}
        rules={[{ required: true }]}>
        <InputNumber min={0} max={365} precision={0} style={{ width: 160 }} />
      </Form.Item>
      <Form.Item name="is_related_party" label={t('sd.f.related')}
        valuePropName="checked" initialValue={false}>
        <Switch />
      </Form.Item>
      <Form.Item name="notes" label={t('sd.notes')}><Input.TextArea rows={3} /></Form.Item>
    </>
  )
}

/** Where we pay the supplier. Shown only to roles that may see bank details. */
export function BankFields() {
  const { t } = useT()
  return (
    <>
      <Form.Item name="bank_name" label={t('sd.bankName')}><Input /></Form.Item>
      <Form.Item name="bank_branch" label={t('sd.bankBranch')}><Input /></Form.Item>
      <Form.Item name="bank_account_name" label={t('sd.accName')}><Input /></Form.Item>
      <Form.Item name="bank_account_no" label={t('sd.accNo')}><Input inputMode="numeric" /></Form.Item>
    </>
  )
}

/** A readable temporary password (no look-alike characters) staff can read out. */
export function makePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/** One password box with a Generate button; the value stays visible so staff can pass it on. */
export function PasswordBox({ name, label, required }: {
  name: string; label: string; required?: boolean
}) {
  const form = Form.useFormInstance()
  const { t } = useT()
  return (
    <Form.Item label={label} required={required}>
      <Space.Compact style={{ width: '100%' }}>
        <Form.Item name={name} noStyle
          rules={[{ required, message: t('sd.f.enterPw') }, { min: 8, message: t('sd.f.pw8') }]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Button onClick={() => form.setFieldValue(name, makePassword())}>{t('sd.f.generate')}</Button>
      </Space.Compact>
    </Form.Item>
  )
}

/** The supplier app login made together with a new supplier: email (above) + a temporary
 *  password. The supplier changes the password at the first sign-in. */
export function AppLoginFields() {
  const { t } = useT()
  return (
    <>
      <Typography.Title level={5}>{t('sd.login.title')}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {t('sd.login.help')}
      </Typography.Paragraph>
      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue }) => {
          const has = !!getFieldValue('app_password')
          return (
            <>
              <PasswordBox name="app_password" label={t('sd.tempPw')} />
              {has && (
                <Form.Item name="app_language" label={t('sd.appLang')} initialValue="si">
                  <Select options={[{ value: 'si', label: 'සිංහල' }, { value: 'en', label: 'English' }]} />
                </Form.Item>
              )}
            </>
          )
        }}
      </Form.Item>
    </>
  )
}
