type Sbom = {
  sbom: {
      SPDXID: string;
      spdxVersion: string;
      creationInfo: {
          created: string;
          creators: string[];
      };
      name: string;
      dataLicense: string;
      documentDescribes: string[];
      documentNamespace: string;
      packages: {
          SPDXID?: string;
          name?: string;
          versionInfo?: string;
          downloadLocation?: string;
          filesAnalyzed?: boolean;
          licenseConcluded?: string;
          licenseDeclared?: string;
          supplier?: string;
          externalRefs?: {
              referenceCategory: string;
              referenceLocator: string;
              referenceType: string;
          }[];
      }[];
  };
};
