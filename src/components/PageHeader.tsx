import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Space } from 'antd'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'

export default function PageHeader(props: {
  title: ReactNode
  subtitle?: ReactNode
  /** A status pill or tag next to the title. */
  status?: ReactNode
  extra?: ReactNode
  back?: string
}) {
  const navigate = useNavigate()
  const { t } = useT()
  return (
    <div className="page-header">
      <Space align="start" size={8}>
        {props.back && (
          <Button type="text" icon={<ArrowLeftOutlined />} aria-label={t('common.back')}
            onClick={() => navigate(props.back!)} />
        )}
        <div>
          <h1 className="page-title">{props.title} {props.status}</h1>
          {props.subtitle && <div className="page-sub">{props.subtitle}</div>}
        </div>
      </Space>
      {props.extra && <div>{props.extra}</div>}
    </div>
  )
}
