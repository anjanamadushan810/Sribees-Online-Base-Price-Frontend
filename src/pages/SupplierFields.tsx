import { Button, Form, Input, InputNumber, Select, Space, Switch, Typography } from 'antd'

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
  return (
    <>
      {withName && (
        <Form.Item name="name" label="Business / registered name" rules={[{ required: true, min: 2 }]}>
          <Input autoFocus />
        </Form.Item>
      )}
      <Form.Item name="contact_name" label="Contact person"><Input /></Form.Item>
      <Form.Item name="phone" label="Phone"><Input inputMode="tel" /></Form.Item>
      <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
      <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
      <Form.Item name="credit_days" label="Credit days (0 = cash)" initialValue={0}
        rules={[{ required: true }]}>
        <InputNumber min={0} max={365} precision={0} style={{ width: 160 }} />
      </Form.Item>
      <Form.Item name="is_related_party" label="Related party (same owner as us)"
        valuePropName="checked" initialValue={false}>
        <Switch />
      </Form.Item>
      <Form.Item name="notes" label="Notes"><Input.TextArea rows={3} /></Form.Item>
    </>
  )
}

/** Where we pay the supplier. Shown only to roles that may see bank details. */
export function BankFields() {
  return (
    <>
      <Form.Item name="bank_name" label="Bank"><Input /></Form.Item>
      <Form.Item name="bank_branch" label="Branch"><Input /></Form.Item>
      <Form.Item name="bank_account_name" label="Account name"><Input /></Form.Item>
      <Form.Item name="bank_account_no" label="Account number"><Input inputMode="numeric" /></Form.Item>
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
  return (
    <Form.Item label={label} required={required}>
      <Space.Compact style={{ width: '100%' }}>
        <Form.Item name={name} noStyle
          rules={[{ required, message: 'Enter a password' }, { min: 8, message: 'At least 8 characters' }]}>
          <Input autoComplete="off" />
        </Form.Item>
        <Button onClick={() => form.setFieldValue(name, makePassword())}>Generate</Button>
      </Space.Compact>
    </Form.Item>
  )
}

/** The supplier app login made together with a new supplier: email (above) + a temporary
 *  password. The supplier changes the password at the first sign-in. */
export function AppLoginFields() {
  return (
    <>
      <Typography.Title level={5}>Supplier app login</Typography.Title>
      <Typography.Paragraph type="secondary">
        The supplier signs in to the app with the email and phone above and this temporary
        password, and must change it the first time. Leave it empty to add the login later
        (App phones tab).
      </Typography.Paragraph>
      <Form.Item noStyle shouldUpdate>
        {({ getFieldValue }) => {
          const has = !!getFieldValue('app_password')
          return (
            <>
              <PasswordBox name="app_password" label="Temporary password" />
              {has && (
                <Form.Item name="app_language" label="App and SMS language" initialValue="si">
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
