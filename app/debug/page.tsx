"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DebugPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Test transaction form
  const [testForm, setTestForm] = useState({
    userId: "",
    amount: "",
    description: "",
    type: "test_transaction",
  })

  const fetchDebugInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/transactions")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch debug info")
      }

      setDebugData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const createTestTransaction = async () => {
    if (!testForm.userId || !testForm.amount || !testForm.description) {
      setError("Please fill all fields")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        throw new Error("No auth token found")
      }

      const response = await fetch("/api/test/create-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(testForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create test transaction")
      }

      setSuccess(data.message)
      setTestForm({
        userId: "",
        amount: "",
        description: "",
        type: "test_transaction",
      })

      // Refresh debug data
      fetchDebugInfo()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction System Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={fetchDebugInfo} disabled={loading}>
              {loading ? "Loading..." : "Fetch Debug Info"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {debugData && (
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="test">Test Transaction</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transactions ({debugData.debug_info.transactions.count})</CardTitle>
              </CardHeader>
              <CardContent>
                {debugData.debug_info.transactions.error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      Error: {JSON.stringify(debugData.debug_info.transactions.error)}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  {debugData.debug_info.transactions.data.map((transaction: any) => (
                    <div key={transaction.id} className="border p-3 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge>{transaction.type}</Badge>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-600">
                            Amount: {transaction.amount} | Balance: {transaction.balance_before} →{" "}
                            {transaction.balance_after}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                            {transaction.status}
                          </Badge>
                          <p className="text-sm text-gray-600">{new Date(transaction.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposits">
            <Card>
              <CardHeader>
                <CardTitle>Deposit Requests ({debugData.debug_info.deposits.count})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {debugData.debug_info.deposits.data.map((deposit: any) => (
                    <div key={deposit.id} className="border p-3 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {deposit.users?.username} - {deposit.amount.toLocaleString()} VND
                          </p>
                          <p className="text-sm text-gray-600">Transaction ID: {deposit.transaction_id}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={deposit.status === "completed" ? "default" : "secondary"}>
                            {deposit.status}
                          </Badge>
                          <p className="text-sm text-gray-600">{new Date(deposit.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users ({debugData.debug_info.users.count})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {debugData.debug_info.users.data.map((user: any) => (
                    <div key={user.id} className="border p-3 rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-gray-600">ID: {user.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{user.balance?.toLocaleString() || 0} VND</p>
                          <Badge>{user.role}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Create Test Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="userId">User ID</Label>
                    <Input
                      id="userId"
                      value={testForm.userId}
                      onChange={(e) => setTestForm((prev) => ({ ...prev, userId: e.target.value }))}
                      placeholder="Enter user ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={testForm.amount}
                      onChange={(e) => setTestForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter amount (positive or negative)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={testForm.description}
                      onChange={(e) => setTestForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter transaction description"
                    />
                  </div>
                  <Button onClick={createTestTransaction} disabled={loading}>
                    {loading ? "Creating..." : "Create Test Transaction"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
