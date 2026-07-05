import PartyList from '../components/PartyList'

export default function Customers() {
  return (
    <PartyList
      tableName="customers"
      title="العملاء"
      balanceLabel="الرصيد (مديون للمحل)"
    />
  )
}
