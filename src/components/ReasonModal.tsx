import { Input, Modal } from 'antd'
import { useState } from 'react'

/** Asks for a short reason (reject, cancel, bounce) before running the action. */
export default function ReasonModal(props: {
  title: string
  okText: string
  danger?: boolean
  loading?: boolean
  onOk: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <Modal open title={props.title} okText={props.okText} onCancel={props.onClose}
      okButtonProps={{ danger: props.danger, disabled: reason.trim().length < 3, loading: props.loading }}
      onOk={() => props.onOk(reason.trim())}>
      <Input.TextArea autoFocus rows={3} maxLength={500} value={reason}
        placeholder="Reason (kept in the audit log)" onChange={(e) => setReason(e.target.value)} />
    </Modal>
  )
}
