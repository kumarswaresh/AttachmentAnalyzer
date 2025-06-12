import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, Cloud, ArrowRight, CheckCircle, XCircle } from "lucide-react";

export default function MarketingComparison() {
  const [openaiResult, setOpenaiResult] = useState<any>(null);
  const [bedrockResult, setBedrockResult] = useState<any>(null);
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [bedrockLoading, setBedrockLoading] = useState(false);

  const testOpenAI = async () => {
    setOpenaiLoading(true);
    try {
      const response = await fetch('/api/marketing/demo-campaign', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setOpenaiResult(data);
    } catch (error) {
      setOpenaiResult({ success: false, error: 'Failed to connect to OpenAI' });
    } finally {
      setOpenaiLoading(false);
    }
  };

  const testBedrock = async () => {
    setBedrockLoading(true);
    try {
      const response = await fetch('/api/marketing/demo-campaign-bedrock', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setBedrockResult(data);
    } catch (error) {
      setBedrockResult({ success: false, error: 'Failed to connect to AWS Bedrock' });
    } finally {
      setBedrockLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">AI Provider Comparison</h1>
        <p className="text-muted-foreground mt-2">
          Compare OpenAI GPT-4o vs AWS Bedrock Claude 3.5 Sonnet for marketing campaign generation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OpenAI Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-blue-500" />
              OpenAI GPT-4o
            </CardTitle>
            <CardDescription>
              Direct API integration with OpenAI's latest model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Model: gpt-4o</p>
                <p className="text-sm text-muted-foreground">Latest multimodal model</p>
              </div>
              <Button
                onClick={testOpenAI}
                disabled={openaiLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {openaiLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test OpenAI"
                )}
              </Button>
            </div>

            {openaiResult && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {openaiResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {openaiResult.success ? "Success" : "Failed"}
                  </span>
                </div>
                
                {openaiResult.success ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Provider:</strong> {openaiResult.provider}
                    </p>
                    <p className="text-sm">
                      <strong>Model:</strong> {openaiResult.model}
                    </p>
                    <p className="text-sm">
                      <strong>Tokens:</strong> {openaiResult.usage?.total_tokens || 0}
                    </p>
                    <div className="bg-blue-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                      {openaiResult.campaign?.content?.substring(0, 200)}...
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">{openaiResult.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AWS Bedrock Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-6 w-6 text-orange-500" />
              AWS Bedrock Claude 3.5
            </CardTitle>
            <CardDescription>
              Enterprise-grade Claude via AWS Bedrock
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Model: claude-3-5-sonnet</p>
                <p className="text-sm text-muted-foreground">Anthropic's latest via AWS</p>
              </div>
              <Button
                onClick={testBedrock}
                disabled={bedrockLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {bedrockLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Bedrock"
                )}
              </Button>
            </div>

            {bedrockResult && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {bedrockResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {bedrockResult.success ? "Success" : "Credentials Required"}
                  </span>
                </div>
                
                {bedrockResult.success ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Provider:</strong> {bedrockResult.provider}
                    </p>
                    <p className="text-sm">
                      <strong>Model:</strong> {bedrockResult.model}
                    </p>
                    <p className="text-sm">
                      <strong>Tokens:</strong> {bedrockResult.usage?.input_tokens || 0}
                    </p>
                    <div className="bg-orange-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                      {bedrockResult.campaign?.content?.substring(0, 200)}...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-orange-600">{bedrockResult.error}</p>
                    <div className="bg-orange-50 p-3 rounded text-sm">
                      <p className="font-medium">Required AWS credentials:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>AWS_ACCESS_KEY_ID</li>
                        <li>AWS_SECRET_ACCESS_KEY</li>
                        <li>AWS_REGION (optional, defaults to us-east-1)</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Feature</th>
                  <th className="text-left p-3">OpenAI GPT-4o</th>
                  <th className="text-left p-3">AWS Bedrock Claude 3.5</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Model Type</td>
                  <td className="p-3">Multimodal (text, vision, audio)</td>
                  <td className="p-3">Text-focused with strong reasoning</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Deployment</td>
                  <td className="p-3">Direct API</td>
                  <td className="p-3">Enterprise AWS infrastructure</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Security</td>
                  <td className="p-3">API key authentication</td>
                  <td className="p-3">AWS IAM and VPC integration</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Pricing</td>
                  <td className="p-3">Per token usage</td>
                  <td className="p-3">AWS pricing with enterprise discounts</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Best For</td>
                  <td className="p-3">Rapid prototyping, multimodal tasks</td>
                  <td className="p-3">Enterprise deployments, compliance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-700">OpenAI Setup</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Get API key from OpenAI dashboard</li>
                <li>Set OPENAI_API_KEY environment variable</li>
                <li>Test with /api/marketing/demo-campaign</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-orange-700">AWS Bedrock Setup</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Configure AWS credentials and region</li>
                <li>Enable Bedrock model access in AWS console</li>
                <li>Set AWS environment variables</li>
                <li>Test with /api/marketing/demo-campaign-bedrock</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}