import { Form, Input, InputNumber, Switch } from 'antd'

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
