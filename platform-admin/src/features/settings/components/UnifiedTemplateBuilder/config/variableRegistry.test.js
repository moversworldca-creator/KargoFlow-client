import { describe, expect, it } from "vitest";
import { normalizeBuilderVariableGroups } from "./variableRegistry";

describe("normalizeBuilderVariableGroups", () => {
  it("maps the backend's grouped variables response to sidebar merge tags", () => {
    expect(
      normalizeBuilderVariableGroups([
        {
          key: "customer",
          label: "Customer",
          variables: [
            { token: "customer.first_name", label: "First name" },
            { token: "customer.email", label: "Email" },
          ],
        },
        {
          key: "custom",
          label: "Custom",
          variables: [{ token: "custom.dot_number", label: "DOT number" }],
        },
      ])
    ).toEqual([
      {
        group: "Customer",
        items: [
          { label: "First name", tag: "{{customer.first_name}}" },
          { label: "Email", tag: "{{customer.email}}" },
        ],
      },
      {
        group: "Custom",
        items: [{ label: "DOT number", tag: "{{custom.dot_number}}" }],
      },
    ]);
  });

  it("accepts a token already wrapped as a merge tag and ignores invalid entries", () => {
    expect(
      normalizeBuilderVariableGroups([
        {
          key: "general",
          label: "General",
          variables: [
            { token: "{{company.name}}", label: "Company name" },
            { label: "Missing token" },
          ],
        },
      ])
    ).toEqual([
      { group: "General", items: [{ label: "Company name", tag: "{{company.name}}" }] },
    ]);
  });
});
