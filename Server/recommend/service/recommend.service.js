import { GetRecommendationsCommand } from "@aws-sdk/client-personalize-runtime";
import { personalizeClient } from "../../config/personalize.js";

export const getRecommendations = async (userId = "1", numResults = 6) => {
  const command = new GetRecommendationsCommand({
    campaignArn: process.env.CAMPAIGN_ARN,
    userId,
    numResults,
  });

  try {
    const response = await personalizeClient.send(command);
    return response.itemList;
  } catch (error) {
    console.error("Error getting recommendations:", error);
    throw error;
  }
};
