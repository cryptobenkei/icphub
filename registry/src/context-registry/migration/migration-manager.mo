import Time "mo:base/Time";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";

module {
    public type Version = {
        major : Nat;
        minor : Nat;
        patch : Nat;
    };

    public type MigrationResult<T> = {
        #ok : T;
        #err : Text;
    };

    public type MigrationStep<T, U> = {
        fromVersion : Version;
        toVersion : Version;
        description : Text;
        transformer : T -> MigrationResult<U>;
        validator : U -> Bool;
    };

    public type MigrationInfo = {
        fromVersion : Version;
        toVersion : Version;
        timestamp : Int;
        success : Bool;
        logs : [Text];
        checksum : ?Text;
    };

    public class MigrationManager() {

        public func versionToText(v : Version) : Text {
            Nat.toText(v.major) # "." # Nat.toText(v.minor) # "." # Nat.toText(v.patch);
        };

        public func compareVersions(v1 : Version, v2 : Version) : {#less; #equal; #greater} {
            if (v1.major != v2.major) {
                return if (v1.major < v2.major) #less else #greater;
            };
            if (v1.minor != v2.minor) {
                return if (v1.minor < v2.minor) #less else #greater;
            };
            if (v1.patch != v2.patch) {
                return if (v1.patch < v2.patch) #less else #greater;
            };
            #equal;
        };

        public func createMigrationInfo(
            fromVersion : Version,
            toVersion : Version,
            success : Bool,
            logs : [Text],
            checksum : ?Text
        ) : MigrationInfo {
            {
                fromVersion;
                toVersion;
                timestamp = Time.now();
                success;
                logs;
                checksum;
            };
        };

        public func executeMigrationStep<T, U>(
            data : T,
            step : MigrationStep<T, U>
        ) : MigrationResult<U> {
            Debug.print("[MIGRATION] Executing: " # step.description);

            switch (step.transformer(data)) {
                case (#ok(transformed)) {
                    if (step.validator(transformed)) {
                        #ok(transformed)
                    } else {
                        #err("Migration validation failed for: " # step.description)
                    }
                };
                case (#err(msg)) {
                    #err("Migration transformation failed: " # msg)
                };
            }
        };

        // Simple checksum calculation for data integrity
        public func calculateChecksum(data : Text) : Text {
            let bytes = Text.encodeUtf8(data);
            var hash : Nat32 = 0;
            for (byte in bytes.vals()) {
                hash := hash * 31 + Nat32.fromNat(Nat8.toNat(byte));
            };
            Nat32.toText(hash);
        };

        // Validation helpers
        public func validateSeasonData(seasonCount : Nat, nameCount : Nat) : Bool {
            seasonCount >= 0 and nameCount >= 0
        };

        public func validateVersionUpgrade(from : Version, to : Version) : Bool {
            switch (compareVersions(from, to)) {
                case (#less) true;   // Upgrade
                case (#equal) true;  // Same version (re-run)
                case (#greater) false; // Downgrade not allowed
            }
        };

        // Log management
        public func createMigrationLog(version : Version, message : Text) : Text {
            "[" # Int.toText(Time.now()) # "] v" # versionToText(version) # ": " # message;
        };

        public func appendLog(logs : [Text], newLog : Text) : [Text] {
            Array.append(logs, [newLog]);
        };
    };
}