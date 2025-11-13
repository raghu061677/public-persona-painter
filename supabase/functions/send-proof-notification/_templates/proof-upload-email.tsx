import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface ProofUploadEmailProps {
  clientName: string;
  campaignName: string;
  assetLocation: string;
  assetCity: string;
  photoCount: number;
  uploadDate: string;
  proofLink?: string;
  organizationName?: string;
}

export const ProofUploadEmail = ({
  clientName,
  campaignName,
  assetLocation,
  assetCity,
  photoCount,
  uploadDate,
  proofLink,
  organizationName = 'Go-Ads 360°',
}: ProofUploadEmailProps) => (
  <Html>
    <Head />
    <Preview>Proof photos uploaded for {campaignName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>📸 Proof Photos Uploaded</Heading>
        
        <Text style={text}>Dear {clientName},</Text>
        
        <Text style={text}>
          We're pleased to inform you that proof photos have been uploaded for your campaign.
        </Text>

        <Section style={infoBox}>
          <Text style={infoText}>
            <strong>Campaign:</strong> {campaignName}
          </Text>
          <Text style={infoText}>
            <strong>Location:</strong> {assetLocation}, {assetCity}
          </Text>
          <Text style={infoText}>
            <strong>Photos Uploaded:</strong> {photoCount}
          </Text>
          <Text style={infoText}>
            <strong>Upload Date:</strong> {uploadDate}
          </Text>
        </Section>

        {proofLink && (
          <>
            <Text style={text}>
              You can view the proof photos by clicking the button below:
            </Text>
            <Section style={buttonContainer}>
              <Link href={proofLink} style={button}>
                View Proof Photos
              </Link>
            </Section>
          </>
        )}

        <Hr style={hr} />

        <Text style={text}>
          The photos have been uploaded and are awaiting verification. You will receive another 
          notification once they are verified by our team.
        </Text>

        <Text style={footerText}>
          Best regards,
          <br />
          {organizationName} Team
        </Text>

        <Hr style={hr} />

        <Text style={disclaimer}>
          This is an automated notification. Please do not reply to this email.
          If you have any questions, please contact your account manager.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ProofUploadEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 40px',
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 40px',
};

const infoText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const buttonContainer = {
  margin: '27px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#1e40af',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 40px 16px',
};

const disclaimer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '16px 40px',
};
