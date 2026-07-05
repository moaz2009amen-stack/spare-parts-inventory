import PartyList from '../components/PartyList'

export default function Suppliers() {
  return (
    <PartyList
      tableName="suppliers"
      title="الموردين"
      balanceLabel="الرصيد (المحل مديون له)"
    />
  )
}
