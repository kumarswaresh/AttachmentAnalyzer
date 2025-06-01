import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function DemoSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSetup, setIsSetup] = useState(false);

  const setupDemo = useMutation({
    mutationFn: async () => {
      // Add sample Ollama model
      const ollamaModel = {
        id: "local-ollama-llama3",
        name: "Llama 3 (Local Ollama)",
        provider: "ollama",
        endpoint: "http://localhost:11434/v1/chat/completions",
        requestFormat: "openai",
        responseMapping: {
          contentPath: "choices.0.message.content",
          errorPath: "error.message"
        },
        parameters: {
          maxTokens: 4000,
          temperature: 0.7
        }
      };

      // Add sample Hugging Face model
      const hfModel = {
        id: "hf-mistral-7b",
        name: "Mistral 7B (Hugging Face)",
        provider: "huggingface",
        endpoint: "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1",
        requestFormat: "custom",
        responseMapping: {
          contentPath: "0.generated_text",
          errorPath: "error"
        },
        parameters: {
          maxTokens: 2000,
          temperature: 0.7
        }
      };

      const responses = await Promise.all([
        fetch("/api/custom-models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ollamaModel),
        }),
        fetch("/api/custom-models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hfModel),
        })
      ]);

      const results = await Promise.all(responses.map(r => r.json()));
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-models"] });
      setIsSetup(true);
      toast({ 
        title: "Demo Setup Complete", 
        description: "Sample custom models have been added. You can now create agents using them." 
      });
    },
    onError: () => {
      toast({ 
        title: "Setup Failed", 
        description: "Failed to setup demo models", 
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Model Demo Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            This will add sample custom model configurations to demonstrate the integration:
          </p>
          
          <div className="space-y-2">
            <div className="p-3 border rounded bg-gray-50">
              <h4 className="font-medium">Llama 3 (Local Ollama)</h4>
              <p className="text-sm text-gray-600">Local deployment via Ollama at localhost:11434</p>
            </div>
            
            <div className="p-3 border rounded bg-gray-50">
              <h4 className="font-medium">Mistral 7B (Hugging Face)</h4>
              <p className="text-sm text-gray-600">Hosted model via Hugging Face Inference API</p>
            </div>
          </div>

          <Button 
            onClick={() => setupDemo.mutate()} 
            disabled={setupDemo.isPending || isSetup}
            className="w-full"
          >
            {setupDemo.isPending ? "Setting up..." : isSetup ? "Demo Setup Complete" : "Setup Demo Models"}
          </Button>

          {isSetup && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 font-medium">Ready to test!</p>
              <p className="text-green-700 text-sm mt-1">
                Go to Agent Builder to create agents using your custom models alongside AWS Bedrock and OpenAI.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}